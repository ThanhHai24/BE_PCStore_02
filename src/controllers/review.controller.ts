import { Request, Response } from "express";
import prisma from "../config/prisma";
import { AuthRequest } from "../middlewares/auth.middleware";

export interface ReviewResponse {
  id: string;
  userId: string;
  productId: string;
  rating: number;
  title: string | null;
  comment: string | null;
  status: string;
  userName: string;
  userAvatar: string | null;
  purchased: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export const getReviewsByProduct = async (req: AuthRequest, res: Response) => {
  try {
    const productId = req.params.productId as string;
    if (!productId) {
      return res.status(400).json({ message: "Product ID or slug is required" });
    }

    // Resolve product ID if slug is passed
    const isNumeric = /^\d+$/.test(productId);
    const product = await prisma.product.findFirst({
      where: isNumeric ? { id: BigInt(productId) } : { slug: productId },
      select: { id: true }
    });


    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    const numericProdId = product.id;

    // Fetch approved reviews with user details
    const reviews = await prisma.review.findMany({
      where: {
        productId: numericProdId,
        status: "APPROVED"
      },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            username: true,
            avatar: true
          }
        }
      },
      orderBy: {
        createdAt: "desc"
      }
    });

    // Check purchase history for all reviewers in one query
    const userIds = [...new Set(reviews.map((r) => r.userId))];
    let purchasedUserIds = new Set<string>();

    if (userIds.length > 0) {
      const purchasedOrders = await prisma.orderItem.findMany({
        where: {
          productId: numericProdId,
          order: {
            userId: { in: userIds },
            status: { in: ["DELIVERED", "SHIPPED", "CONFIRMED", "PROCESSING"] }
          }
        },
        select: {
          order: {
            select: { userId: true }
          }
        }
      });

      purchasedOrders.forEach((item) => {
        if (item.order?.userId) {
          purchasedUserIds.add(item.order.userId.toString());
        }
      });
    }

    // Format reviews list
    const formattedReviews: ReviewResponse[] = reviews.map((rev) => {
      const userIdStr = rev.userId.toString();
      return {
        id: rev.id.toString(),
        userId: userIdStr,
        productId: rev.productId.toString(),
        rating: rev.rating,
        title: rev.title,
        comment: rev.comment,
        status: rev.status,
        userName: rev.user?.fullName || rev.user?.username || "Khách hàng",
        userAvatar: rev.user?.avatar || null,
        purchased: purchasedUserIds.has(userIdStr),
        createdAt: rev.createdAt,
        updatedAt: rev.updatedAt
      };
    });

    // Breakdown & statistics
    const totalReviews = formattedReviews.length;
    const avgRating = totalReviews > 0
      ? Number((formattedReviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews).toFixed(1))
      : 0;

    const starCounts = [5, 4, 3, 2, 1].map((star) => {
      const count = formattedReviews.filter((r) => r.rating === star).length;
      const percentage = totalReviews > 0 ? Number(((count / totalReviews) * 100).toFixed(1)) : 0;
      return { star, count, percentage };
    });

    return res.json({
      productId: numericProdId.toString(),
      summary: {
        totalReviews,
        avgRating,
        starCounts
      },
      reviews: formattedReviews
    });
  } catch (error: any) {
    console.error("Error fetching product reviews:", error);
    return res.status(500).json({ message: "Internal server error", error: error.message });
  }
};

export const createReview = async (req: AuthRequest, res: Response) => {
  try {
    const productId = req.params.productId as string;
    const { rating, comment, title } = req.body;
    const currentUserId = req.user?.userId;

    if (!currentUserId) {
      return res.status(401).json({ message: "Unauthorized: User not authenticated" });
    }

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ message: "Rating must be between 1 and 5" });
    }

    if (!comment || !comment.trim()) {
      return res.status(400).json({ message: "Comment is required" });
    }

    // Resolve product ID
    const isNumeric = /^\d+$/.test(productId);
    const product = await prisma.product.findFirst({
      where: isNumeric ? { id: BigInt(productId) } : { slug: productId },
      select: { id: true }
    });

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    const numericProdId = product.id;
    const numericUserId = BigInt(currentUserId);

    // Upsert review (user can review a product once or update existing review)
    const existingReview = await prisma.review.findUnique({
      where: {
        userId_productId: {
          userId: numericUserId,
          productId: numericProdId
        }
      }
    });

    let review;
    if (existingReview) {
      review = await prisma.review.update({
        where: { id: existingReview.id },
        data: {
          rating: Number(rating),
          comment: comment.trim(),
          title: title ? title.trim() : null,
          status: "APPROVED" // Auto approve for instant response
        },
        include: {
          user: {
            select: { id: true, fullName: true, username: true, avatar: true }
          }
        }
      });
    } else {
      review = await prisma.review.create({
        data: {
          userId: numericUserId,
          productId: numericProdId,
          rating: Number(rating),
          comment: comment.trim(),
          title: title ? title.trim() : null,
          status: "APPROVED"
        },
        include: {
          user: {
            select: { id: true, fullName: true, username: true, avatar: true }
          }
        }
      });
    }

    // Check if user has purchased this product
    const orderItem = await prisma.orderItem.findFirst({
      where: {
        productId: numericProdId,
        order: {
          userId: numericUserId,
          status: { in: ["DELIVERED", "SHIPPED", "CONFIRMED", "PROCESSING"] }
        }
      }
    });

    const formattedReview: ReviewResponse = {
      id: review.id.toString(),
      userId: review.userId.toString(),
      productId: review.productId.toString(),
      rating: review.rating,
      title: review.title,
      comment: review.comment,
      status: review.status,
      userName: review.user?.fullName || review.user?.username || "Khách hàng",
      userAvatar: review.user?.avatar || null,
      purchased: !!orderItem,
      createdAt: review.createdAt,
      updatedAt: review.updatedAt
    };

    return res.status(existingReview ? 200 : 201).json({
      message: existingReview ? "Review updated successfully" : "Review submitted successfully",
      review: formattedReview
    });
  } catch (error: any) {
    console.error("Error creating review:", error);
    return res.status(500).json({ message: "Internal server error", error: error.message });
  }
};

export const deleteReview = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const currentUserId = req.user?.userId;
    const currentUserRole = req.user?.role;

    if (!currentUserId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const review = await prisma.review.findUnique({
      where: { id: BigInt(id) }
    });

    if (!review) {
      return res.status(404).json({ message: "Review not found" });
    }

    if (review.userId.toString() !== currentUserId && currentUserRole !== "ADMIN") {
      return res.status(403).json({ message: "Forbidden: Cannot delete this review" });
    }

    await prisma.review.delete({
      where: { id: BigInt(id) }
    });

    return res.json({ message: "Review deleted successfully" });
  } catch (error: any) {
    console.error("Error deleting review:", error);
    return res.status(500).json({ message: "Internal server error", error: error.message });
  }
};

export const getAllReviews = async (req: AuthRequest, res: Response) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 10));
    const status = req.query.status as string;
    const rating = req.query.rating ? parseInt(req.query.rating as string) : undefined;
    const search = req.query.search as string;

    const whereClause: any = {};

    if (status) {
      whereClause.status = status.toUpperCase();
    }
    if (rating && rating >= 1 && rating <= 5) {
      whereClause.rating = rating;
    }
    if (search) {
      whereClause.OR = [
        { comment: { contains: search, mode: "insensitive" } },
        { user: { fullName: { contains: search, mode: "insensitive" } } },
        { product: { name: { contains: search, mode: "insensitive" } } }
      ];
    }

    const total = await prisma.review.count({ where: whereClause });
    const reviews = await prisma.review.findMany({
      where: whereClause,
      include: {
        user: { select: { id: true, fullName: true, username: true, email: true } },
        product: { select: { id: true, name: true, slug: true, image: true } }
      },
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: "desc" }
    });

    const formatted = reviews.map((r) => ({
      id: r.id.toString(),
      rating: r.rating,
      comment: r.comment,
      title: r.title,
      status: r.status,
      createdAt: r.createdAt,
      user: {
        id: r.user.id.toString(),
        fullName: r.user.fullName,
        username: r.user.username,
        email: r.user.email
      },
      product: {
        id: r.product.id.toString(),
        name: r.product.name,
        slug: r.product.slug,
        image: r.product.image
      }
    }));

    return res.json({
      reviews: formatted,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error: any) {
    console.error("Error getting all reviews:", error);
    return res.status(500).json({ message: "Internal server error", error: error.message });
  }
};

export const updateReviewStatus = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const { status } = req.body;

    if (!status || !["PENDING", "APPROVED", "REJECTED"].includes(status.toUpperCase())) {
      return res.status(400).json({ message: "Invalid status value" });
    }

    const updated = await prisma.review.update({
      where: { id: BigInt(id) },
      data: { status: status.toUpperCase() as any }
    });


    return res.json({
      message: `Review status updated to ${updated.status}`,
      review: {
        id: updated.id.toString(),
        status: updated.status
      }
    });
  } catch (error: any) {
    console.error("Error updating review status:", error);
    return res.status(500).json({ message: "Internal server error", error: error.message });
  }
};
