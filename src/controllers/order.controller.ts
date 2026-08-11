import { Request, Response } from "express";
import { OrderStatus, PaymentMethod, PaymentStatus } from "@prisma/client";
import prisma from "../config/prisma";
import { AuthRequest } from "../middlewares/auth.middleware";
import { formatOrderResponse } from "../utils/orderMapper";
import { sendOrderConfirmationEmail } from "../services/email.service";

/**
 * Create a new order (Supports guest and authenticated users)
 */
export const createOrder = async (req: AuthRequest, res: Response) => {
    try {
        const {
            customerName,
            customerEmail,
            email,
            customerPhone,
            shippingAddress,
            paymentMethod = "COD",
            notes,
            couponCode,
            shippingFee = 0,
            items: reqItems
        } = req.body;

        const finalCustomerEmail = (customerEmail || email || "").trim() || null;

        // Validation
        if (!customerName || !customerPhone || !shippingAddress) {
            return res.status(400).json({
                message: "Missing required fields: customerName, customerPhone, shippingAddress"
            });
        }

        const validPaymentMethods: PaymentMethod[] = ["COD", "VNPAY", "MOMO", "STRIPE", "MOCK"];
        if (!validPaymentMethods.includes(paymentMethod)) {
            return res.status(400).json({
                message: `Invalid paymentMethod. Allowed: ${validPaymentMethods.join(", ")}`
            });
        }

        let orderItemsToCreate: {
            productId: bigint;
            quantity: number;
            price: number;
            productName: string;
            productSku: string | null;
            specifications: any;
        }[] = [];

        const userId = req.user?.userId ? BigInt(req.user.userId) : null;

        // Determine items source: direct payload vs user cart
        if (Array.isArray(reqItems) && reqItems.length > 0) {
            // Process items from request body
            const productIds = reqItems
                .map((i: any) => {
                    try {
                        return BigInt(i.productId);
                    } catch {
                        return null;
                    }
                })
                .filter((id): id is bigint => id !== null);

            const products = await prisma.product.findMany({
                where: { id: { in: productIds } }
            });

            const productMap = new Map(products.map(p => [p.id.toString(), p]));

            for (const item of reqItems) {
                let pId: bigint | null = null;
                try {
                    pId = BigInt(item.productId);
                } catch {
                    pId = null;
                }
                const quantity = Number(item.quantity);
                const product = pId !== null ? productMap.get(pId.toString()) : null;

                if (!product) {
                    return res.status(400).json({
                        message: `Product with ID ${item.productId} not found`
                    });
                }

                if (product.status !== "ACTIVE") {
                    return res.status(400).json({
                        message: `Product "${product.name}" is currently unavailable`
                    });
                }

                if (product.stock < quantity) {
                    return res.status(400).json({
                        message: `Insufficient stock for product "${product.name}". Available: ${product.stock}, requested: ${quantity}`
                    });
                }

                orderItemsToCreate.push({
                    productId: product.id,
                    quantity,
                    price: product.price,
                    productName: product.name,
                    productSku: product.sku,
                    specifications: product.specifications
                });
            }
        } else if (userId) {
            // Fetch items from user's active cart
            const cart = await prisma.cart.findUnique({
                where: { userId },
                include: {
                    items: {
                        include: { product: true }
                    }
                }
            });

            if (!cart || cart.items.length === 0) {
                return res.status(400).json({
                    message: "Cart is empty and no order items were provided"
                });
            }

            for (const item of cart.items) {
                const product = item.product;

                if (product.status !== "ACTIVE") {
                    return res.status(400).json({
                        message: `Product "${product.name}" is currently unavailable`
                    });
                }

                if (product.stock < item.quantity) {
                    return res.status(400).json({
                        message: `Insufficient stock for product "${product.name}". Available: ${product.stock}, requested: ${item.quantity}`
                    });
                }

                orderItemsToCreate.push({
                    productId: product.id,
                    quantity: item.quantity,
                    price: product.price,
                    productName: product.name,
                    productSku: product.sku,
                    specifications: product.specifications
                });
            }
        } else {
            return res.status(400).json({
                message: "Items list is required for guest checkout"
            });
        }

        // Calculate Subtotal
        const subtotal = orderItemsToCreate.reduce(
            (sum, item) => sum + item.price * item.quantity,
            0
        );

        // Process Coupon Discount if provided
        let discountAmount = 0;
        let appliedCoupon = null;

        if (couponCode) {
            const coupon = await prisma.coupon.findUnique({
                where: { code: couponCode }
            });

            const now = new Date();

            if (!coupon || !coupon.isActive) {
                return res.status(400).json({ message: "Invalid or inactive coupon code" });
            }

            if (coupon.startAt > now || coupon.endAt < now) {
                return res.status(400).json({ message: "Coupon code has expired or is not yet valid" });
            }

            if (coupon.usageLimit !== null && coupon.usedCount >= coupon.usageLimit) {
                return res.status(400).json({ message: "Coupon usage limit reached" });
            }

            if (coupon.minOrderValue !== null && subtotal < coupon.minOrderValue) {
                return res.status(400).json({
                    message: `Subtotal must be at least ${coupon.minOrderValue.toLocaleString()} to apply this coupon`
                });
            }

            if (coupon.type === "PERCENT") {
                let calculated = Math.floor((subtotal * coupon.value) / 100);
                if (coupon.maxDiscount !== null) {
                    calculated = Math.min(calculated, coupon.maxDiscount);
                }
                discountAmount = calculated;
            } else if (coupon.type === "FIXED") {
                discountAmount = Math.min(subtotal, coupon.value);
            }

            appliedCoupon = coupon;
        }

        const numericShippingFee = Number(shippingFee) || 0;
        const totalAmount = Math.max(0, subtotal + numericShippingFee - discountAmount);
        const orderCode = `ORD-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

        // Database transaction: Create order, decrement stock, log history, clear cart if applicable
        const result = await prisma.$transaction(async (tx) => {
            // 1. Create Order record
            const newOrder = await tx.order.create({
                data: {
                    code: orderCode,
                    ...(userId ? { user: { connect: { id: userId } } } : {}),
                    customerName,
                    customerEmail: finalCustomerEmail,
                    customerPhone,
                    shippingAddress,
                    subtotal,
                    shippingFee: numericShippingFee,
                    discountAmount,
                    totalAmount,
                    status: OrderStatus.PENDING,
                    paymentMethod,
                    paymentStatus: PaymentStatus.PENDING,
                    notes: notes || null,
                    couponCode: couponCode || null,
                    items: {
                        create: orderItemsToCreate.map(item => ({
                            productId: item.productId,
                            quantity: item.quantity,
                            price: item.price,
                            productName: item.productName,
                            productSku: item.productSku,
                            specifications: item.specifications
                        }))
                    },
                    payment: {
                        create: {
                            method: paymentMethod,
                            amount: totalAmount,
                            status: PaymentStatus.PENDING
                        }
                    },
                    statusHistories: {
                        create: {
                            status: OrderStatus.PENDING,
                            notes: "Order created successfully",
                            ...(userId ? { changedBy: { connect: { id: userId } } } : {})
                        }
                    }
                },
                include: {
                    items: { include: { product: true } },
                    payment: true,
                    statusHistories: { include: { changedBy: true } },
                    user: true
                }
            });

            // 2. Decrement product stock & update status if out of stock
            for (const item of orderItemsToCreate) {
                const updatedProduct = await tx.product.update({
                    where: { id: item.productId },
                    data: {
                        stock: { decrement: item.quantity }
                    }
                });
                if (updatedProduct.stock <= 0 && updatedProduct.status === "ACTIVE") {
                    await tx.product.update({
                        where: { id: item.productId },
                        data: { status: "OUT_OF_STOCK" }
                    });
                }
            }

            // 3. Update coupon usage if applied
            if (appliedCoupon) {
                await tx.coupon.update({
                    where: { id: appliedCoupon.id },
                    data: { usedCount: { increment: 1 } }
                });

                if (userId) {
                    await tx.couponUsage.create({
                        data: {
                            couponId: appliedCoupon.id,
                            userId,
                            orderId: newOrder.id
                        }
                    });
                }
            }

            // 4. Clear user's cart if order was created from cart and not direct items
            if (userId && (!Array.isArray(reqItems) || reqItems.length === 0)) {
                const userCart = await tx.cart.findUnique({ where: { userId } });
                if (userCart) {
                    await tx.cartItem.deleteMany({
                        where: { cartId: userCart.id }
                    });
                }
            }

            return newOrder;
        });

        // Trigger async order confirmation email dispatch
        const targetEmail = finalCustomerEmail || result.user?.email || null;
        if (targetEmail) {
            sendOrderConfirmationEmail({
                toEmail: targetEmail,
                orderCode: result.code,
                customerName: result.customerName,
                customerPhone: result.customerPhone,
                shippingAddress: result.shippingAddress,
                paymentMethod: result.paymentMethod,
                subtotal: result.subtotal,
                shippingFee: result.shippingFee,
                discountAmount: result.discountAmount,
                totalAmount: result.totalAmount,
                createdAt: result.createdAt,
                items: result.items.map(item => ({
                    productName: item.productName,
                    quantity: item.quantity,
                    price: item.price
                }))
            }).catch(err => {
                console.error("Async Order Email Error:", err);
            });
        } else {
            console.log(`ℹ️ Order #${result.code} created without customer email address.`);
        }

        return res.status(201).json({
            message: "Order placed successfully",
            order: formatOrderResponse(result)
        });

    } catch (error) {
        console.error("CreateOrder Error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
};

/**
 * Get authenticated user's order history
 */
export const getUserOrders = async (req: AuthRequest, res: Response) => {
    try {
        if (!req.user?.userId) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        const userId = BigInt(req.user.userId);
        const page = Math.max(1, parseInt(req.query.page as string) || 1);
        const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 10));
        const status = req.query.status as OrderStatus;

        const whereClause: any = { userId };
        if (status && Object.values(OrderStatus).includes(status)) {
            whereClause.status = status;
        }

        const skip = (page - 1) * limit;

        const [total, orders] = await Promise.all([
            prisma.order.count({ where: whereClause }),
            prisma.order.findMany({
                where: whereClause,
                skip,
                take: limit,
                orderBy: { createdAt: "desc" },
                include: {
                    items: { include: { product: true } },
                    payment: true,
                    statusHistories: true
                }
            })
        ]);

        return res.json({
            orders: orders.map(formatOrderResponse),
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            }
        });

    } catch (error) {
        console.error("GetUserOrders Error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
};

/**
 * Get single order details by ID or Code
 */
export const getOrderByIdOrCode = async (req: AuthRequest, res: Response) => {
    try {
        const idOrCodeParam = req.params.idOrCode;
        const idOrCode = Array.isArray(idOrCodeParam) ? idOrCodeParam[0] : idOrCodeParam;
        const phoneQuery = req.query.phone as string;

        if (!idOrCode) {
            return res.status(400).json({ message: "Order ID or Code is required" });
        }

        const isNumeric = /^\d+$/.test(idOrCode);

        const order = await prisma.order.findFirst({
            where: isNumeric ? { id: BigInt(idOrCode) } : { code: idOrCode },
            include: {
                items: { include: { product: true } },
                payment: true,
                statusHistories: { include: { changedBy: true } },
                user: true
            }
        });

        if (!order) {
            return res.status(404).json({ message: "Order not found" });
        }

        // Access permissions check
        const loggedInUserId = req.user?.userId ? BigInt(req.user.userId) : null;
        const isAdmin = req.user?.role === "ADMIN";
        const isOwner = loggedInUserId !== null && order.userId === loggedInUserId;
        const matchesPhone = Boolean(phoneQuery && order.customerPhone === phoneQuery);

        if (!isAdmin && !isOwner && !matchesPhone) {
            return res.status(403).json({
                message: "Access denied. Order belongs to another user or requires phone verification query param '?phone=...'"
            });
        }

        return res.json({
            order: formatOrderResponse(order)
        });

    } catch (error) {
        console.error("GetOrderByIdOrCode Error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
};

/**
 * Cancel an order (Allowed for customer while PENDING/CONFIRMED or by Admin)
 */
export const cancelOrder = async (req: AuthRequest, res: Response) => {
    try {
        if (!req.user?.userId) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        const idParam = req.params.id;
        const id = Array.isArray(idParam) ? idParam[0] : idParam;
        const { reason } = req.body || {};

        if (!id) {
            return res.status(400).json({ message: "Order ID is required" });
        }

        const isNumeric = /^\d+$/.test(id);
        const order = await prisma.order.findFirst({
            where: isNumeric ? { id: BigInt(id) } : { code: id },
            include: { items: true }
        });

        if (!order) {
            return res.status(404).json({ message: "Order not found" });
        }

        const userId = BigInt(req.user.userId);
        const isAdmin = req.user.role === "ADMIN";
        const isOwner = order.userId === userId;

        if (!isAdmin && !isOwner) {
            return res.status(403).json({ message: "Forbidden: You can only cancel your own orders" });
        }

        if (order.status === OrderStatus.CANCELLED) {
            return res.status(400).json({ message: "Order is already cancelled" });
        }

        // Customers can only cancel PENDING or CONFIRMED orders
        if (!isAdmin && order.status !== OrderStatus.PENDING && order.status !== OrderStatus.CONFIRMED) {
            return res.status(400).json({
                message: `Order cannot be cancelled because it is in '${order.status}' status`
            });
        }

        // Cancel order & restore stock in transaction
        const updatedOrder = await prisma.$transaction(async (tx) => {
            // 1. Update Order status
            const updated = await tx.order.update({
                where: { id: order.id },
                data: {
                    status: OrderStatus.CANCELLED,
                    statusHistories: {
                        create: {
                            status: OrderStatus.CANCELLED,
                            notes: reason || `Cancelled by ${isAdmin ? "Admin" : "Customer"}`,
                            changedById: userId
                        }
                    }
                },
                include: {
                    items: { include: { product: true } },
                    payment: true,
                    statusHistories: { include: { changedBy: true } },
                    user: true
                }
            });

            // 2. Restore product stock & reactive product status if previously out of stock
            for (const item of order.items) {
                const updatedProduct = await tx.product.update({
                    where: { id: item.productId },
                    data: {
                        stock: { increment: item.quantity }
                    }
                });
                if (updatedProduct.stock > 0 && updatedProduct.status === "OUT_OF_STOCK") {
                    await tx.product.update({
                        where: { id: item.productId },
                        data: { status: "ACTIVE" }
                    });
                }
            }

            return updated;
        });

        return res.json({
            message: "Order cancelled successfully",
            order: formatOrderResponse(updatedOrder)
        });

    } catch (error) {
        console.error("CancelOrder Error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
};

/**
 * List all orders (Admin only)
 */
export const getAllOrders = async (req: Request, res: Response) => {
    try {
        const page = Math.max(1, parseInt(req.query.page as string) || 1);
        const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 10));
        const status = req.query.status as OrderStatus;
        const paymentStatus = req.query.paymentStatus as PaymentStatus;
        const search = req.query.search as string;

        const whereClause: any = {};

        if (status && Object.values(OrderStatus).includes(status)) {
            whereClause.status = status;
        }

        if (paymentStatus && Object.values(PaymentStatus).includes(paymentStatus)) {
            whereClause.paymentStatus = paymentStatus;
        }

        if (search) {
            whereClause.OR = [
                { code: { contains: search, mode: "insensitive" } },
                { customerName: { contains: search, mode: "insensitive" } },
                { customerPhone: { contains: search, mode: "insensitive" } }
            ];
        }

        const skip = (page - 1) * limit;

        const [total, orders] = await Promise.all([
            prisma.order.count({ where: whereClause }),
            prisma.order.findMany({
                where: whereClause,
                skip,
                take: limit,
                orderBy: { createdAt: "desc" },
                include: {
                    items: { include: { product: true } },
                    payment: true,
                    statusHistories: true,
                    user: true
                }
            })
        ]);

        return res.json({
            orders: orders.map(formatOrderResponse),
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            }
        });

    } catch (error) {
        console.error("GetAllOrders Error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
};

/**
 * Update order status (Admin only)
 * Flow: PENDING → CONFIRMED → PROCESSING → SHIPPING → SHIPPED → DELIVERED | CANCELLED
 * Admin can change status between any valid states.
 */
export const updateOrderStatus = async (req: AuthRequest, res: Response) => {
    try {
        const idParam = req.params.id;
        const id = Array.isArray(idParam) ? idParam[0] : idParam;
        const { status, notes } = req.body || {};

        if (!status) {
            return res.status(400).json({ message: "Status is required" });
        }

        const normalizedStatus = String(status).toUpperCase() as OrderStatus;
        const validStatuses = Object.values(OrderStatus);
        
        if (!validStatuses.includes(normalizedStatus)) {
            return res.status(400).json({
                message: `Invalid status '${status}'. Allowed values: ${validStatuses.join(", ")}`
            });
        }

        // Find order by numeric ID or code
        const isNumeric = /^\d+$/.test(id);
        const order = await prisma.order.findFirst({
            where: isNumeric ? { id: BigInt(id) } : { code: id },
            include: { items: true, payment: true }
        });

        if (!order) {
            return res.status(404).json({ message: "Order not found" });
        }

        const previousStatus = order.status;
        const adminId = req.user?.userId ? BigInt(req.user.userId) : null;

        // Verify adminId exists in database before using as foreign key
        let validAdminId: bigint | null = null;
        if (adminId) {
            const adminUser = await prisma.user.findUnique({ where: { id: adminId } });
            if (adminUser) {
                validAdminId = adminId;
            }
        }

        const updatedOrder = await prisma.$transaction(async (tx) => {
            const updateData: any = {
                status: normalizedStatus,
                statusHistories: {
                    create: {
                        status: normalizedStatus,
                        notes: notes || `Trạng thái được cập nhật bởi Admin (${previousStatus} → ${normalizedStatus})`,
                        changedById: validAdminId
                    }
                }
            };

            // Auto-update paymentStatus to PAID when DELIVERED if currently PENDING
            if (normalizedStatus === OrderStatus.DELIVERED && order.paymentStatus === PaymentStatus.PENDING) {
                updateData.paymentStatus = PaymentStatus.PAID;
                if (order.payment) {
                    await tx.payment.update({
                        where: { id: order.payment.id },
                        data: {
                            status: PaymentStatus.PAID,
                            paidAt: new Date()
                        }
                    });
                }
            }

            // Auto-update paymentStatus to FAILED when CANCELLED if currently PENDING
            if (normalizedStatus === OrderStatus.CANCELLED && order.paymentStatus === PaymentStatus.PENDING) {
                updateData.paymentStatus = PaymentStatus.FAILED;
                if (order.payment) {
                    await tx.payment.update({
                        where: { id: order.payment.id },
                        data: {
                            status: PaymentStatus.FAILED
                        }
                    });
                }
            }


            // 1. Update order
            const updated = await tx.order.update({
                where: { id: order.id },
                data: updateData,
                include: {
                    items: { include: { product: true } },
                    payment: true,
                    statusHistories: { include: { changedBy: true } },
                    user: true
                }
            });

            // 2. Stock handling:
            // Changing TO CANCELLED from active status -> Restore product stock & activate status
            if (normalizedStatus === OrderStatus.CANCELLED && (previousStatus as string) !== "CANCELLED") {
                for (const item of order.items) {
                    const updatedProduct = await tx.product.update({
                        where: { id: item.productId },
                        data: { stock: { increment: item.quantity } }
                    });
                    if (updatedProduct.stock > 0 && updatedProduct.status === "OUT_OF_STOCK") {
                        await tx.product.update({
                            where: { id: item.productId },
                            data: { status: "ACTIVE" }
                        });
                    }
                }
            }

            // Changing FROM CANCELLED to active status -> Deduct product stock
            if ((previousStatus as string) === "CANCELLED" && normalizedStatus !== OrderStatus.CANCELLED) {
                for (const item of order.items) {
                    const updatedProduct = await tx.product.update({
                        where: { id: item.productId },
                        data: { stock: { decrement: item.quantity } }
                    });
                    if (updatedProduct.stock <= 0 && updatedProduct.status === "ACTIVE") {
                        await tx.product.update({
                            where: { id: item.productId },
                            data: { status: "OUT_OF_STOCK" }
                        });
                    }
                }
            }

            return updated;
        });

        return res.json({
            message: `Trạng thái đơn hàng đã cập nhật thành ${normalizedStatus}`,
            order: formatOrderResponse(updatedOrder)
        });

    } catch (error) {
        console.error("UpdateOrderStatus Error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
};


/**
 * Update payment status (Admin only)
 */
export const updatePaymentStatus = async (req: AuthRequest, res: Response) => {
    try {
        const idParam = req.params.id;
        const id = Array.isArray(idParam) ? idParam[0] : idParam;
        const { paymentStatus, transactionCode } = req.body || {};

        if (!paymentStatus || !Object.values(PaymentStatus).includes(paymentStatus)) {
            return res.status(400).json({
                message: `Invalid paymentStatus. Allowed values: ${Object.values(PaymentStatus).join(", ")}`
            });
        }

        const isNumeric = /^\d+$/.test(id);
        const order = await prisma.order.findFirst({
            where: isNumeric ? { id: BigInt(id) } : { code: id },
            include: { payment: true, items: { include: { product: true } } }
        });

        if (!order) {
            return res.status(404).json({ message: "Order not found" });
        }

        const isPaid = paymentStatus === PaymentStatus.PAID || paymentStatus === PaymentStatus.SUCCESS;

        const updatedOrder = await prisma.$transaction(async (tx) => {
            const updated = await tx.order.update({
                where: { id: order.id },
                data: {
                    paymentStatus
                },
                include: {
                    items: { include: { product: true } },
                    payment: true,
                    statusHistories: { include: { changedBy: true } },
                    user: true
                }
            });

            if (order.payment) {
                await tx.payment.update({
                    where: { id: order.payment.id },
                    data: {
                        status: paymentStatus,
                        transactionCode: transactionCode || order.payment.transactionCode,
                        paidAt: isPaid ? new Date() : order.payment.paidAt
                    }
                });
            }

            return updated;
        });

        return res.json({
            message: `Payment status updated to ${paymentStatus}`,
            order: formatOrderResponse(updatedOrder)
        });

    } catch (error) {
        console.error("UpdatePaymentStatus Error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
};
