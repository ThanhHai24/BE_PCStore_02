import prisma from "../src/config/prisma";
import { OrderStatus, PaymentMethod, PaymentStatus } from "@prisma/client";

const seedOrder = async () => {
    const count = await prisma.order.count();
    if (count > 0) {
        console.log("[Seed] Orders: already seeded, skipping.");
        return;
    }

    const products = await prisma.product.findMany({ take: 10 });
    if (products.length === 0) {
        console.warn("⚠️ No products found in database. Please seed products first!");
        return;
    }

    const adminUser = await prisma.user.findFirst({ where: { role: "ADMIN" } });
    const customerUser = await prisma.user.findFirst({ where: { role: "CUSTOMER" } });

    const p1 = products[0];
    const p2 = products[1] || p1;
    const p3 = products[2] || p1;

    // 1. Orders
    await prisma.order.createMany({
        data: [
            {
                id: BigInt("1"),
                code: "DH001",
                userId: customerUser?.id || null,
                customerName: customerUser?.fullName || "Nguyễn Văn Customer",
                customerPhone: "0123456789",
                shippingAddress: "Address 1, Hà Nội",
                subtotal: p1.price + p2.price,
                shippingFee: 0,
                discountAmount: 0,
                totalAmount: p1.price + p2.price,
                status: OrderStatus.CANCELLED,
                paymentMethod: PaymentMethod.COD,
                paymentStatus: PaymentStatus.PENDING,
                notes: null,
                createdAt: new Date("2026-06-06T21:45:48.351Z"),
                updatedAt: new Date("2026-06-07T02:02:54.444Z")
            },
            {
                id: BigInt("2"),
                code: "DH002",
                userId: customerUser?.id || null,
                customerName: customerUser?.fullName || "Nguyễn Văn Customer",
                customerPhone: "0987654321",
                shippingAddress: "Address 2, TP.HCM",
                subtotal: p1.price + p2.price,
                shippingFee: 0,
                discountAmount: 0,
                totalAmount: p1.price + p2.price,
                status: OrderStatus.PENDING,
                paymentMethod: PaymentMethod.COD,
                paymentStatus: PaymentStatus.PENDING,
                notes: null,
                createdAt: new Date("2026-06-06T21:45:48.354Z"),
                updatedAt: new Date("2026-06-06T21:45:48.354Z")
            },
            {
                id: BigInt("3"),
                code: "PCS-20260607-C27C8Q",
                userId: adminUser?.id || null,
                customerName: adminUser?.fullName || "System Administrator",
                customerPhone: "0123332221",
                shippingAddress: "123, Xã Ea Trang, Huyện M Đrắk, Đắk Lắk",
                subtotal: p3.price * 2,
                shippingFee: 225500,
                discountAmount: 0,
                totalAmount: p3.price * 2 + 225500,
                status: OrderStatus.DELIVERED,
                paymentMethod: PaymentMethod.VNPAY,
                paymentStatus: PaymentStatus.PAID,
                notes: "",
                createdAt: new Date("2026-06-07T05:51:34.175Z"),
                updatedAt: new Date("2026-06-07T08:04:07.719Z")
            },
            {
                id: BigInt("4"),
                code: "PCS-20260607-MD8EVQ",
                userId: adminUser?.id || null,
                customerName: adminUser?.fullName || "System Administrator",
                customerPhone: "0123332221",
                shippingAddress: "123, Xã Krông Jing, Huyện M Đrắk, Đắk Lắk",
                subtotal: p3.price * 4,
                shippingFee: 225500,
                discountAmount: 0,
                totalAmount: p3.price * 4 + 225500,
                status: OrderStatus.PENDING,
                paymentMethod: PaymentMethod.COD,
                paymentStatus: PaymentStatus.PENDING,
                notes: "",
                createdAt: new Date("2026-06-07T15:50:45.272Z"),
                updatedAt: new Date("2026-06-07T15:50:45.272Z")
            },
            {
                id: BigInt("5"),
                code: "PCS-20260607-OHF2G3",
                userId: adminUser?.id || null,
                customerName: adminUser?.fullName || "System Administrator",
                customerPhone: "0123332221",
                shippingAddress: "123, Xã Trúc Sơn, Huyện Cư Jút, Đắk Nông",
                subtotal: p3.price * 1,
                shippingFee: 225500,
                discountAmount: 0,
                totalAmount: p3.price * 1 + 225500,
                status: OrderStatus.SHIPPED,
                paymentMethod: PaymentMethod.COD,
                paymentStatus: PaymentStatus.PENDING,
                notes: "",
                createdAt: new Date("2026-06-07T15:52:28.078Z"),
                updatedAt: new Date("2026-06-07T15:53:21.832Z")
            },
            {
                id: BigInt("6"),
                code: "PCS-20260608-VPN9AN",
                userId: adminUser?.id || null,
                customerName: adminUser?.fullName || "System Administrator",
                customerPhone: "0123332221",
                shippingAddress: "12312, Xã Ea Trang, Huyện M Đrắk, Đắk Lắk",
                subtotal: p1.price + p2.price * 4,
                shippingFee: 225500,
                discountAmount: 0,
                totalAmount: p1.price + p2.price * 4 + 225500,
                status: OrderStatus.PENDING,
                paymentMethod: PaymentMethod.VNPAY,
                paymentStatus: PaymentStatus.PAID,
                notes: "",
                createdAt: new Date("2026-06-08T04:00:12.250Z"),
                updatedAt: new Date("2026-06-08T04:01:13.823Z")
            }
        ],
    });

    // 2. Order Items (using available products in DB)
    await prisma.orderItem.createMany({
        data: [
            {
                id: BigInt("1"),
                orderId: BigInt("1"),
                productId: p1.id,
                quantity: 1,
                price: p1.price,
                productName: p1.name,
                productSku: p1.sku,
                specifications: null,
                createdAt: new Date("2026-06-06T21:45:48.351Z"),
                updatedAt: new Date("2026-06-06T21:45:48.351Z")
            },
            {
                id: BigInt("2"),
                orderId: BigInt("1"),
                productId: p2.id,
                quantity: 1,
                price: p2.price,
                productName: p2.name,
                productSku: p2.sku,
                specifications: null,
                createdAt: new Date("2026-06-06T21:45:48.351Z"),
                updatedAt: new Date("2026-06-06T21:45:48.351Z")
            },
            {
                id: BigInt("3"),
                orderId: BigInt("2"),
                productId: p1.id,
                quantity: 1,
                price: p1.price,
                productName: p1.name,
                productSku: p1.sku,
                specifications: null,
                createdAt: new Date("2026-06-06T21:45:48.354Z"),
                updatedAt: new Date("2026-06-06T21:45:48.354Z")
            },
            {
                id: BigInt("4"),
                orderId: BigInt("2"),
                productId: p2.id,
                quantity: 1,
                price: p2.price,
                productName: p2.name,
                productSku: p2.sku,
                specifications: null,
                createdAt: new Date("2026-06-06T21:45:48.354Z"),
                updatedAt: new Date("2026-06-06T21:45:48.354Z")
            },
            {
                id: BigInt("5"),
                orderId: BigInt("3"),
                productId: p3.id,
                quantity: 2,
                price: p3.price,
                productName: p3.name,
                productSku: p3.sku,
                specifications: null,
                createdAt: new Date("2026-06-07T05:51:34.175Z"),
                updatedAt: new Date("2026-06-07T05:51:34.175Z")
            },
            {
                id: BigInt("6"),
                orderId: BigInt("4"),
                productId: p3.id,
                quantity: 4,
                price: p3.price,
                productName: p3.name,
                productSku: p3.sku,
                specifications: null,
                createdAt: new Date("2026-06-07T15:50:45.272Z"),
                updatedAt: new Date("2026-06-07T15:50:45.272Z")
            },
            {
                id: BigInt("7"),
                orderId: BigInt("5"),
                productId: p3.id,
                quantity: 1,
                price: p3.price,
                productName: p3.name,
                productSku: p3.sku,
                specifications: null,
                createdAt: new Date("2026-06-07T15:52:28.078Z"),
                updatedAt: new Date("2026-06-07T15:52:28.078Z")
            },
            {
                id: BigInt("8"),
                orderId: BigInt("6"),
                productId: p1.id,
                quantity: 1,
                price: p1.price,
                productName: p1.name,
                productSku: p1.sku,
                specifications: null,
                createdAt: new Date("2026-06-08T04:00:12.250Z"),
                updatedAt: new Date("2026-06-08T04:00:12.250Z")
            },
            {
                id: BigInt("9"),
                orderId: BigInt("6"),
                productId: p2.id,
                quantity: 4,
                price: p2.price,
                productName: p2.name,
                productSku: p2.sku,
                specifications: null,
                createdAt: new Date("2026-06-08T04:00:12.250Z"),
                updatedAt: new Date("2026-06-08T04:00:12.250Z")
            }
        ],
    });

    // 3. Order Status Histories
    await prisma.orderStatusHistory.createMany({
        data: [
            {
                id: BigInt("1"),
                orderId: BigInt("1"),
                status: OrderStatus.CANCELLED,
                notes: "Khách hàng hủy đơn hàng",
                changedById: null,
                createdAt: new Date("2026-06-07T02:02:54.444Z")
            },
            {
                id: BigInt("2"),
                orderId: BigInt("3"),
                status: OrderStatus.PENDING,
                notes: "Đơn hàng được tạo",
                changedById: adminUser?.id || null,
                createdAt: new Date("2026-06-07T05:51:34.175Z")
            },
            {
                id: BigInt("3"),
                orderId: BigInt("3"),
                status: OrderStatus.CONFIRMED,
                notes: "Trạng thái được cập nhật",
                changedById: adminUser?.id || null,
                createdAt: new Date("2026-06-07T08:04:02.107Z")
            },
            {
                id: BigInt("4"),
                orderId: BigInt("3"),
                status: OrderStatus.PROCESSING,
                notes: "Trạng thái được cập nhật",
                changedById: adminUser?.id || null,
                createdAt: new Date("2026-06-07T08:04:05.314Z")
            },
            {
                id: BigInt("5"),
                orderId: BigInt("3"),
                status: OrderStatus.SHIPPED,
                notes: "Trạng thái được cập nhật",
                changedById: adminUser?.id || null,
                createdAt: new Date("2026-06-07T08:04:06.492Z")
            },
            {
                id: BigInt("6"),
                orderId: BigInt("3"),
                status: OrderStatus.DELIVERED,
                notes: "Trạng thái được cập nhật",
                changedById: adminUser?.id || null,
                createdAt: new Date("2026-06-07T08:04:07.719Z")
            },
            {
                id: BigInt("7"),
                orderId: BigInt("4"),
                status: OrderStatus.PENDING,
                notes: "Đơn hàng được tạo",
                changedById: adminUser?.id || null,
                createdAt: new Date("2026-06-07T15:50:45.272Z")
            },
            {
                id: BigInt("8"),
                orderId: BigInt("5"),
                status: OrderStatus.PENDING,
                notes: "Đơn hàng được tạo",
                changedById: adminUser?.id || null,
                createdAt: new Date("2026-06-07T15:52:28.078Z")
            },
            {
                id: BigInt("9"),
                orderId: BigInt("5"),
                status: OrderStatus.CONFIRMED,
                notes: "Trạng thái được cập nhật",
                changedById: adminUser?.id || null,
                createdAt: new Date("2026-06-07T15:52:50.001Z")
            },
            {
                id: BigInt("10"),
                orderId: BigInt("5"),
                status: OrderStatus.PROCESSING,
                notes: "Trạng thái được cập nhật",
                changedById: adminUser?.id || null,
                createdAt: new Date("2026-06-07T15:53:20.468Z")
            },
            {
                id: BigInt("11"),
                orderId: BigInt("5"),
                status: OrderStatus.SHIPPED,
                notes: "Trạng thái được cập nhật",
                changedById: adminUser?.id || null,
                createdAt: new Date("2026-06-07T15:53:21.832Z")
            },
            {
                id: BigInt("12"),
                orderId: BigInt("6"),
                status: OrderStatus.PENDING,
                notes: "Đơn hàng được tạo",
                changedById: adminUser?.id || null,
                createdAt: new Date("2026-06-08T04:00:12.250Z")
            }
        ],
    });

    // 4. Shipping Orders
    await prisma.shippingOrder.createMany({
        data: [
            {
                id: BigInt("1"),
                orderId: BigInt("3"),
                providerId: BigInt("1"),
                trackingNumber: "MOCK-1780819446488",
                shippingCost: 225500,
                estimatedDeliveryDate: new Date("2026-06-10T08:04:06.488Z"),
                actualDeliveryDate: null,
                status: "IN_TRANSIT",
                createdAt: new Date("2026-06-07T08:04:06.489Z"),
                updatedAt: new Date("2026-06-07T08:04:06.489Z")
            },
            {
                id: BigInt("2"),
                orderId: BigInt("5"),
                providerId: BigInt("1"),
                trackingNumber: "MOCK-1780847601827",
                shippingCost: 225500,
                estimatedDeliveryDate: new Date("2026-06-10T15:53:21.827Z"),
                actualDeliveryDate: null,
                status: "IN_TRANSIT",
                createdAt: new Date("2026-06-07T15:53:21.829Z"),
                updatedAt: new Date("2026-06-07T15:53:21.829Z")
            }
        ],
    });

    // 5. Payments
    await prisma.payment.createMany({
        data: [
            {
                id: BigInt("1"),
                orderId: BigInt("3"),
                method: PaymentMethod.VNPAY,
                amount: p3.price * 2 + 225500,
                status: PaymentStatus.SUCCESS,
                transactionCode: "15572644",
                createdAt: new Date("2026-06-07T05:52:00.633Z")
            },
            {
                id: BigInt("2"),
                orderId: BigInt("6"),
                method: PaymentMethod.VNPAY,
                amount: p1.price + p2.price * 4 + 225500,
                status: PaymentStatus.SUCCESS,
                transactionCode: "15573772",
                createdAt: new Date("2026-06-08T04:01:13.827Z")
            }
        ],
    });

    console.log("[Seed] Orders, Items, Statuses, Shipping, Payments: seeded successfully.");
};

export default seedOrder;