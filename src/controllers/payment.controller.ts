import { Request, Response } from "express";
import crypto from "crypto";

// Helper function to sort object keys alphabetically for VNPay checksum
function sortObject(obj: Record<string, any>): Record<string, any> {
    const sorted: Record<string, any> = {};
    const str: string[] = [];
    for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
            str.push(encodeURIComponent(key));
        }
    }
    str.sort();
    for (let key = 0; key < str.length; key++) {
        sorted[str[key]] = encodeURIComponent(obj[str[key]]).replace(/%20/g, "+");
    }
    return sorted;
}

function formatDate(date: Date): string {
    const yyyy = date.getFullYear().toString();
    const mm = (date.getMonth() + 1).toString().padStart(2, "0");
    const dd = date.getDate().toString().padStart(2, "0");
    const hh = date.getHours().toString().padStart(2, "0");
    const min = date.getMinutes().toString().padStart(2, "0");
    const ss = date.getSeconds().toString().padStart(2, "0");
    return `${yyyy}${mm}${dd}${hh}${min}${ss}`;
}

export const createPaymentUrl = async (req: Request, res: Response) => {
    try {
        const { amount, orderInfo, orderId, bankCode } = req.body;

        if (!amount || isNaN(Number(amount))) {
            return res.status(400).json({ message: "Số tiền thanh toán (amount) không hợp lệ" });
        }

        const tmnCode = process.env.VNP_TMN_CODE || "ZFPH6DKL";
        const secretKey = process.env.VNP_HASH_SECRET || "BUBVSSCQQDHNLTCHGLTXHJABDCABLRWH";
        const vnpUrl = process.env.VNP_URL || "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html";
        const returnUrl = process.env.VNP_RETURN_URL || "http://localhost:4000/vnpay-return";

        const date = new Date();
        const createDate = formatDate(date);
        const txnRef = orderId ? `${orderId}_${date.getTime()}` : `${date.getTime()}`;

        let ipAddr =
            (req.headers["x-forwarded-for"] as string) ||
            req.socket.remoteAddress ||
            "127.0.0.1";
        if (ipAddr === "::1" || ipAddr === "::ffff:127.0.0.1") {
            ipAddr = "127.0.0.1";
        }

        let vnp_Params: Record<string, any> = {
            vnp_Version: "2.1.0",
            vnp_Command: "pay",
            vnp_TmnCode: tmnCode,
            vnp_Locale: "vn",
            vnp_CurrCode: "VND",
            vnp_TxnRef: txnRef,
            vnp_OrderInfo: orderInfo || `Thanh toan don hang ${txnRef}`,
            vnp_OrderType: "other",
            vnp_Amount: Math.round(Number(amount) * 100),
            vnp_ReturnUrl: returnUrl,
            vnp_IpAddr: ipAddr,
            vnp_CreateDate: createDate,
        };

        if (bankCode) {
            vnp_Params["vnp_BankCode"] = bankCode;
        }

        const sortedParams = sortObject(vnp_Params);
        const signData = Object.keys(sortedParams)
            .map((key) => `${key}=${sortedParams[key]}`)
            .join("&");

        const hmac = crypto.createHmac("sha512", secretKey);
        const signed = hmac.update(Buffer.from(signData, "utf-8")).digest("hex");

        const finalUrl = `${vnpUrl}?${signData}&vnp_SecureHash=${signed}`;

        return res.json({
            status: "success",
            paymentUrl: finalUrl,
            txnRef,
        });
    } catch (error: any) {
        console.error("Error creating VNPay URL:", error);
        return res.status(500).json({ message: "Lỗi hệ thống khi tạo URL VNPay", error: error.message });
    }
};

export const vnpayReturn = async (req: Request, res: Response) => {
    try {
        let vnp_Params = { ...req.query } as Record<string, any>;
        const secureHash = vnp_Params["vnp_SecureHash"];

        delete vnp_Params["vnp_SecureHash"];
        delete vnp_Params["vnp_SecureHashType"];

        const secretKey = process.env.VNP_HASH_SECRET || "BUBVSSCQQDHNLTCHGLTXHJABDCABLRWH";

        const sortedParams = sortObject(vnp_Params);
        const signData = Object.keys(sortedParams)
            .map((key) => `${key}=${sortedParams[key]}`)
            .join("&");

        const hmac = crypto.createHmac("sha512", secretKey);
        const signed = hmac.update(Buffer.from(signData, "utf-8")).digest("hex");

        if (secureHash === signed) {
            const responseCode = vnp_Params["vnp_ResponseCode"];
            if (responseCode === "00") {
                return res.json({
                    status: "success",
                    code: "00",
                    message: "Thanh toán thành công",
                    data: vnp_Params,
                });
            } else {
                return res.json({
                    status: "failed",
                    code: responseCode,
                    message: "Thanh toán không thành công hoặc bị hủy",
                    data: vnp_Params,
                });
            }
        } else {
            return res.status(400).json({
                status: "failed",
                code: "97",
                message: "Chữ ký không hợp lệ (Checksum failed)",
            });
        }
    } catch (error: any) {
        console.error("Error verifying VNPay return:", error);
        return res.status(500).json({ message: "Lỗi kiểm tra chữ ký VNPay", error: error.message });
    }
};

