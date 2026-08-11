import nodemailer from "nodemailer";

interface EmailOrderItem {
    productName: string;
    quantity: number;
    price: number;
}

interface OrderEmailData {
    toEmail: string;
    orderCode: string;
    customerName: string;
    customerPhone: string;
    shippingAddress: string;
    paymentMethod: string;
    subtotal: number;
    shippingFee: number;
    discountAmount: number;
    totalAmount: number;
    createdAt?: Date | string;
    items: EmailOrderItem[];
}

/**
 * Create Nodemailer transporter based on ENV or fallback Ethereal Test Account
 */
const createTransporter = async () => {
    const host = process.env.SMTP_HOST || "smtp.gmail.com";
    const port = Number(process.env.SMTP_PORT) || 587;
    const user = process.env.SMTP_USER || "";
    const pass = process.env.SMTP_PASS || "";

    if (user && pass) {
        return nodemailer.createTransport({
            host,
            port,
            secure: port === 465, // true for 465, false for 587
            auth: { user, pass },
            tls: {
                rejectUnauthorized: false
            }
        });
    }

    // Fallback: Ethereal test account if real SMTP credentials are missing
    try {
        const testAccount = await nodemailer.createTestAccount();
        console.log("ℹ️ Using Ethereal Test Account for sending emails.");
        console.log(`   User: ${testAccount.user}`);
        return nodemailer.createTransport({
            host: "smtp.ethereal.email",
            port: 587,
            secure: false,
            auth: {
                user: testAccount.user,
                pass: testAccount.pass
            }
        });
    } catch (err) {
        console.warn("⚠️ Failed to create Ethereal test account, email sending may be logged only.");
        return null;
    }
};

/**
 * Format currency in VND
 */
const formatVND = (amount: number): string => {
    return amount.toLocaleString("vi-VN") + " ₫";
};

/**
 * Generate HTML Template for Order Confirmation Email
 */
const generateOrderHtml = (data: OrderEmailData): string => {
    const orderDateStr = data.createdAt
        ? new Date(data.createdAt).toLocaleString("vi-VN", {
            timeZone: "Asia/Ho_Chi_Minh",
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit"
        })
        : new Date().toLocaleString("vi-VN");

    const itemRowsHtml = data.items
        .map(
            (item, index) => `
        <tr style="border-bottom: 1px solid #f1f5f9;">
            <td style="padding: 12px 8px; color: #334155; font-size: 14px;">${index + 1}. <strong>${item.productName}</strong></td>
            <td style="padding: 12px 8px; color: #475569; text-align: center; font-size: 14px;">x${item.quantity}</td>
            <td style="padding: 12px 8px; color: #475569; text-align: right; font-size: 14px;">${formatVND(item.price)}</td>
            <td style="padding: 12px 8px; color: #2563eb; font-weight: bold; text-align: right; font-size: 14px;">${formatVND(item.price * item.quantity)}</td>
        </tr>
    `
        )
        .join("");

    return `
    <!DOCTYPE html>
    <html lang="vi">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Xác Nhận Đơn Hàng ${data.orderCode}</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
        <div style="max-width: 650px; margin: 20px auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.05); border: 1px solid #e2e8f0;">
            
            <!-- Header -->
            <div style="background: linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%); padding: 30px 24px; text-align: center; color: #ffffff;">
                <h1 style="margin: 0 0 8px 0; font-size: 26px; font-weight: 800; letter-spacing: -0.5px;">PC STORE</h1>
                <p style="margin: 0; font-size: 15px; opacity: 0.9;">Xác Nhận Đặt Hàng Thành Công 🎉</p>
            </div>

            <!-- Content -->
            <div style="padding: 28px 24px;">
                <p style="font-size: 15px; color: #1e293b; margin-top: 0;">Xin chào <strong>${data.customerName}</strong>,</p>
                <p style="font-size: 14px; color: #475569; line-height: 1.6;">
                    Cảm ơn bạn đã tin tưởng và đặt mua sắm tại <strong>PC Store</strong>. Đơn hàng của bạn đã được ghi nhận vào hệ thống và đang được nhân viên chuẩn bị xử lý.
                </p>

                <!-- Order Info Summary Box -->
                <div style="background: #f1f5f9; border-radius: 12px; padding: 18px; margin: 20px 0; border: 1px solid #cbd5e1;">
                    <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                        <tr>
                            <td style="padding: 4px 0; color: #64748b;">Mã đơn hàng:</td>
                            <td style="padding: 4px 0; color: #2563eb; font-weight: bold; text-align: right;">${data.orderCode}</td>
                        </tr>
                        <tr>
                            <td style="padding: 4px 0; color: #64748b;">Thời gian đặt:</td>
                            <td style="padding: 4px 0; color: #334155; text-align: right;">${orderDateStr}</td>
                        </tr>
                        <tr>
                            <td style="padding: 4px 0; color: #64748b;">Phương thức thanh toán:</td>
                            <td style="padding: 4px 0; color: #334155; font-weight: 600; text-align: right;">${data.paymentMethod}</td>
                        </tr>
                    </table>
                </div>

                <!-- Customer & Delivery Address -->
                <div style="margin-bottom: 24px;">
                    <h3 style="font-size: 15px; color: #1e293b; margin-bottom: 8px; border-bottom: 2px solid #e2e8f0; padding-bottom: 6px;">📍 Thông tin giao hàng</h3>
                    <p style="margin: 4px 0; font-size: 14px; color: #334155;"><strong>Người nhận:</strong> ${data.customerName}</p>
                    <p style="margin: 4px 0; font-size: 14px; color: #334155;"><strong>Số điện thoại:</strong> ${data.customerPhone}</p>
                    <p style="margin: 4px 0; font-size: 14px; color: #334155;"><strong>Địa chỉ giao:</strong> ${data.shippingAddress}</p>
                </div>

                <!-- Items Table -->
                <div style="margin-bottom: 24px;">
                    <h3 style="font-size: 15px; color: #1e293b; margin-bottom: 12px; border-bottom: 2px solid #e2e8f0; padding-bottom: 6px;">📦 Chi tiết sản phẩm đã chọn</h3>
                    <table style="width: 100%; border-collapse: collapse; text-align: left;">
                        <thead>
                            <tr style="background: #f8fafc; color: #64748b; font-size: 13px; text-transform: uppercase;">
                                <th style="padding: 10px 8px; border-bottom: 2px solid #e2e8f0;">Sản phẩm</th>
                                <th style="padding: 10px 8px; text-align: center; border-bottom: 2px solid #e2e8f0;">SL</th>
                                <th style="padding: 10px 8px; text-align: right; border-bottom: 2px solid #e2e8f0;">Đơn giá</th>
                                <th style="padding: 10px 8px; text-align: right; border-bottom: 2px solid #e2e8f0;">Tổng</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${itemRowsHtml}
                        </tbody>
                    </table>
                </div>

                <!-- Pricing Summary -->
                <div style="background: #fafafa; border-radius: 12px; padding: 16px; margin-top: 20px; border: 1px solid #f1f5f9;">
                    <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                        <tr>
                            <td style="padding: 4px 0; color: #64748b;">Tạm tính:</td>
                            <td style="padding: 4px 0; color: #334155; text-align: right;">${formatVND(data.subtotal)}</td>
                        </tr>
                        <tr>
                            <td style="padding: 4px 0; color: #64748b;">Phí vận chuyển:</td>
                            <td style="padding: 4px 0; color: #334155; text-align: right;">${data.shippingFee > 0 ? formatVND(data.shippingFee) : "Miễn phí"}</td>
                        </tr>
                        ${data.discountAmount > 0 ? `
                        <tr>
                            <td style="padding: 4px 0; color: #16a34a;">Giảm giá Voucher:</td>
                            <td style="padding: 4px 0; color: #16a34a; text-align: right;">-${formatVND(data.discountAmount)}</td>
                        </tr>
                        ` : ""}
                        <tr style="border-top: 2px solid #e2e8f0;">
                            <td style="padding: 12px 0 4px 0; font-size: 16px; font-weight: bold; color: #0f172a;">Tổng thanh toán:</td>
                            <td style="padding: 12px 0 4px 0; font-size: 18px; font-weight: bold; color: #2563eb; text-align: right;">${formatVND(data.totalAmount)}</td>
                        </tr>
                    </table>
                </div>

                <div style="margin-top: 28px; padding-top: 20px; border-top: 1px solid #e2e8f0; text-align: center; color: #64748b; font-size: 13px;">
                    <p style="margin: 0 0 6px 0;">Nếu cần hỗ trợ gấp, vui lòng liên hệ hotline: <strong style="color: #2563eb;">1900 xxxx</strong> hoặc phản hồi trực tiếp email này.</p>
                    <p style="margin: 0;">Trân trọng,<br><strong>Đội ngũ Chăm sóc khách hàng PC Store</strong></p>
                </div>
            </div>

            <!-- Footer -->
            <div style="background: #f1f5f9; padding: 16px; text-align: center; color: #94a3b8; font-size: 12px; border-top: 1px solid #e2e8f0;">
                © ${new Date().getFullYear()} PC Store. All rights reserved.
            </div>
        </div>
    </body>
    </html>
    `;
};

/**
 * Asynchronously Send Order Confirmation Email
 */
export const sendOrderConfirmationEmail = async (data: OrderEmailData): Promise<boolean> => {
    try {
        if (!data.toEmail || !data.toEmail.includes("@")) {
            console.warn(`⚠️ Cannot send order confirmation email: Invalid recipient address (${data.toEmail})`);
            return false;
        }

        const transporter = await createTransporter();
        if (!transporter) {
            console.warn("⚠️ No email transporter available.");
            return false;
        }

        const from = process.env.SMTP_FROM || `"PC Store" <no-reply@pcstore.com>`;
        const subject = `[PC Store] Xác nhận đơn hàng thành công #${data.orderCode}`;
        const html = generateOrderHtml(data);

        const info = await transporter.sendMail({
            from,
            to: data.toEmail,
            subject,
            html
        });

        console.log(`✉️ Email confirmation sent to ${data.toEmail} (MessageID: ${info.messageId})`);

        // If using Ethereal, log preview link
        const previewUrl = nodemailer.getTestMessageUrl(info);
        if (previewUrl) {
            console.log(`🔗 Preview Ethereal Email at: ${previewUrl}`);
        }

        return true;
    } catch (error) {
        console.error("❌ Error sending order confirmation email:", error);
        return false;
    }
};
