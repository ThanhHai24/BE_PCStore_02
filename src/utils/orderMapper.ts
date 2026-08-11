import { Order, OrderItem, Payment, OrderStatusHistory, User, Product } from "@prisma/client";

export interface OrderItemResponse {
    id: string;
    orderId: string;
    productId: string;
    quantity: number;
    price: number;
    productName: string;
    productSku: string | null;
    specifications: any;
    image?: string | null;
    createdAt: Date;
    updatedAt: Date;
}

export interface PaymentResponse {
    id: string;
    orderId: string;
    method: string | null;
    paymentMethodId: string | null;
    amount: number;
    status: string;
    transactionCode: string | null;
    paymentUrl: string | null;
    paidAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
}

export interface OrderStatusHistoryResponse {
    id: string;
    orderId: string;
    status: string;
    notes: string | null;
    changedById: string | null;
    changedByName?: string | null;
    createdAt: Date;
}

export interface OrderResponse {
    id: string;
    code: string;
    userId: string | null;
    customerName: string;
    customerEmail?: string | null;
    customerPhone: string;
    shippingAddress: string;
    subtotal: number;
    shippingFee: number;
    discountAmount: number;
    totalAmount: number;
    status: string;
    paymentMethod: string;
    paymentStatus: string;
    notes: string | null;
    couponCode: string | null;
    items?: OrderItemResponse[];
    payment?: PaymentResponse | null;
    statusHistories?: OrderStatusHistoryResponse[];
    user?: {
        id: string;
        username: string;
        email: string;
        fullName: string;
    } | null;
    createdAt: Date;
    updatedAt: Date;
}

export const formatOrderItemResponse = (
    item: OrderItem & { product?: Product | null }
): OrderItemResponse => {
    return {
        id: item.id.toString(),
        orderId: item.orderId.toString(),
        productId: item.productId.toString(),
        quantity: item.quantity,
        price: item.price,
        productName: item.productName,
        productSku: item.productSku,
        specifications: item.specifications,
        image: item.product?.image || null,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt
    };
};

export const formatPaymentResponse = (payment: Payment): PaymentResponse => {
    return {
        id: payment.id.toString(),
        orderId: payment.orderId.toString(),
        method: payment.method,
        paymentMethodId: payment.paymentMethodId ? payment.paymentMethodId.toString() : null,
        amount: payment.amount,
        status: payment.status,
        transactionCode: payment.transactionCode,
        paymentUrl: payment.paymentUrl,
        paidAt: payment.paidAt,
        createdAt: payment.createdAt,
        updatedAt: payment.updatedAt
    };
};

export const formatOrderStatusHistoryResponse = (
    history: OrderStatusHistory & { changedBy?: User | null }
): OrderStatusHistoryResponse => {
    return {
        id: history.id.toString(),
        orderId: history.orderId.toString(),
        status: history.status,
        notes: history.notes,
        changedById: history.changedById ? history.changedById.toString() : null,
        changedByName: history.changedBy ? history.changedBy.fullName : null,
        createdAt: history.createdAt
    };
};

export const formatOrderResponse = (
    order: Order & {
        items?: (OrderItem & { product?: Product | null })[];
        payment?: Payment | null;
        statusHistories?: (OrderStatusHistory & { changedBy?: User | null })[];
        user?: User | null;
    }
): OrderResponse => {
    return {
        id: order.id.toString(),
        code: order.code,
        userId: order.userId ? order.userId.toString() : null,
        customerName: order.customerName,
        customerEmail: order.customerEmail || null,
        customerPhone: order.customerPhone,
        shippingAddress: order.shippingAddress,
        subtotal: order.subtotal,
        shippingFee: order.shippingFee,
        discountAmount: order.discountAmount,
        totalAmount: order.totalAmount,
        status: order.status,
        paymentMethod: order.paymentMethod,
        paymentStatus: order.paymentStatus,
        notes: order.notes,
        couponCode: order.couponCode,
        items: order.items ? order.items.map(formatOrderItemResponse) : undefined,
        payment: order.payment !== undefined ? (order.payment ? formatPaymentResponse(order.payment) : null) : undefined,
        statusHistories: order.statusHistories ? order.statusHistories.map(formatOrderStatusHistoryResponse) : undefined,
        user: order.user
            ? {
                  id: order.user.id.toString(),
                  username: order.user.username,
                  email: order.user.email,
                  fullName: order.user.fullName
              }
            : null,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt
    };
};
