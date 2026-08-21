import dotenv from 'dotenv';
import nodemailer from 'nodemailer';
dotenv.config();

export interface SellerOnboardDetails {
  sellerName: string;
  storeName: string;
  email: string;
  phone: string;
  address: string;
}

export const sendSellerOnboardEmail = async (details: SellerOnboardDetails) => {
  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: Number(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER || process.env.EMAIL_FROM,
        pass: process.env.SMTP_PASS, // User must provide this in .env
      },
    });

    const fromEmail = process.env.EMAIL_FROM || 'ranjitkumarbgs61@gmail.com';
    const adminEmails = process.env.ADMIN_EMAILS || 'Sharmaankit7860@gmail.com, ranjitkumarbgs61@gmail.com';

    const info = await transporter.sendMail({
      from: `"Drapeit Admin" <${fromEmail}>`,
      to: adminEmails,
      subject: "New Seller Onboarded to Drapeit",
      text: `A new seller has just onboarded successfully to Drapeit.\n\nDetails:\nSeller Name: ${details.sellerName}\nStore Name: ${details.storeName}\nEmail: ${details.email || 'N/A'}\nPhone: ${details.phone || 'N/A'}\nAddress: ${details.address || 'N/A'}\n\nPlease review their details in the admin panel: https://www.drapeit.in/admin/login`,
      html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; color: #334155; padding: 24px; line-height: 1.5;">
                <p>A new seller has just onboarded successfully to Drapeit.</p>
                <ul style="padding-left: 20px;">
                    <li style="margin-bottom: 8px;"><strong>Seller Name:</strong> ${details.sellerName}</li>
                    <li style="margin-bottom: 8px;"><strong>Store Name:</strong> ${details.storeName}</li>
                    <li style="margin-bottom: 8px;"><strong>Email:</strong> ${details.email || 'N/A'}</li>
                    <li style="margin-bottom: 8px;"><strong>Phone:</strong> ${details.phone || 'N/A'}</li>
                    <li style="margin-bottom: 8px;"><strong>Address:</strong> ${details.address || 'N/A'}</li>
                </ul>
                <div style="text-align: center; margin: 24px 0;">
                    <a href="https://www.drapeit.in/admin/login" style="background-color: #0f172a; color: #ffffff; padding: 10px 20px; text-decoration: none; border-radius: 4px; font-weight: bold; display: inline-block;">Go to Portal</a>
                </div>
            </div>
            `,
    });

    console.log("Seller onboard email sent: %s", info.messageId);
  } catch (error) {
    console.error("Error sending seller onboard email:", error);
  }
};

export const sendSellerWelcomeEmail = async (email: string, sellerName: string) => {
  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: Number(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER || process.env.EMAIL_FROM,
        pass: process.env.SMTP_PASS, // User must provide this in .env
      },
    });

    const fromEmail = process.env.EMAIL_FROM || 'ranjitkumarbgs61@gmail.com';

    const info = await transporter.sendMail({
      from: `"Drapeit" <${fromEmail}>`,
      to: email,
      subject: "Welcome to Drapeit – Let's Grow Together",
      text: `Dear ${sellerName},\n\nWe're thrilled to welcome you to Drapeit!\n\nYour onboarding has been successfully completed, and your documents are under review by our team. Your review process will be completed within 2 working days.\n\nAt Drapeit, we're building more than just a marketplace—we're creating a platform where brands, businesses, and customers connect through trust, quality, and innovation. We are excited to have your brand join us on this journey.\n\nAs a valued seller partner, you now have access to a growing customer base, powerful selling tools, and a dedicated team committed to helping your business succeed.\n\nHere's what you can do next:\n• Upload and showcase your products\n• Manage inventory and pricing effortlessly\n• Track orders and business performance in real time\n• Engage with customers and build lasting relationships\n\nLogin to Seller Portal: https://www.drapeit.in/login\n\nWarm regards,\nTeam DrapeIt`,
      html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; color: #334155;">
                <div style="background-color: #0f172a; padding: 24px; text-align: center; color: #ffffff;">
                    <h1 style="margin: 0; font-size: 24px;">Drapeit</h1>
                    <p style="margin: 4px 0 0 0; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; color: #94a3b8;">Seller Portal</p>
                </div>
                
                <div style="padding: 24px; line-height: 1.5;">
                    <h2 style="color: #0f172a; font-size: 18px; margin-top: 0;">Dear ${sellerName},</h2>
                    <p>We're thrilled to welcome you to <strong>Drapeit</strong>!</p>
                    
                    <div style="background-color: #f0fdf4; border-left: 4px solid #16a34a; padding: 12px; color: #14532d; border-radius: 4px; margin-bottom: 20px;">
                        Your onboarding is successfully completed, and your documents are under review. This process is usually completed within 2 working days.
                    </div>
                    
                    <p>At Drapeit, we're building a platform where brands, businesses, and customers connect through trust, quality, and innovation. We are excited to have your brand join us.</p>
                    
                    <h3 style="color: #0f172a; font-size: 15px; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px; margin-top: 20px;">Here's what you can do next:</h3>
                    <ul style="padding-left: 20px; margin: 0 0 20px 0;">
                        <li style="margin-bottom: 8px;">Upload and showcase your products</li>
                        <li style="margin-bottom: 8px;">Manage inventory and pricing effortlessly</li>
                        <li style="margin-bottom: 8px;">Track orders and performance in real time</li>
                        <li style="margin-bottom: 8px;">Engage with customers and build lasting relationships</li>
                    </ul>
                    
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="https://www.drapeit.in/login" style="background-color: #0f172a; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold; display: inline-block;">Login to Seller Portal</a>
                    </div>
                    
                    <p>Thank you for placing your trust in Drapeit. We're excited to have you onboard.</p>
                    <p style="margin-bottom: 0;">Warm regards,<br><strong>Team Drapeit</strong></p>
                </div>
            </div>
            `
    });

    console.log("Seller welcome email sent: %s", info.messageId);
  } catch (error) {
    console.error("Error sending seller welcome email:", error);
  }
};

export const sendSellerApprovalEmail = async (email: string, sellerName: string) => {
  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: Number(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER || process.env.EMAIL_FROM,
        pass: process.env.SMTP_PASS, // User must provide this in .env
      },
    });

    const fromEmail = process.env.EMAIL_FROM || 'ranjitkumarbgs61@gmail.com';

    const info = await transporter.sendMail({
      from: `"Drapeit" <${fromEmail}>`,
      to: email,
      subject: "Welcome to Drapeit – Your Store is Now Live!",
      text: `Dear ${sellerName},\n\nWelcome to Drapeit!\n\nWe are excited to have you join our growing community of trusted sellers. Your review process has been successfully completed, and your store is now part of the Drapeit marketplace.\n\nAt Drapeit, our mission is to connect quality products with customers through a seamless shopping experience.\n\nWhat's Next?\n• Start uploading and managing your products through the seller dashboard.\n• Keep your inventory and pricing updated to maximize visibility and sales.\n• Monitor orders, performance metrics, and customer feedback in real time.\n• Reach out to our support team whenever you need assistance.\n\nLogin to Seller Portal: https://www.drapeit.in/login\n\nWarm regards,\nTeam Drapeit`,
      html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; color: #334155;">
                <div style="background-color: #0f172a; padding: 24px; text-align: center; color: #ffffff;">
                    <h1 style="margin: 0; font-size: 24px;">Drapeit</h1>
                    <p style="margin: 4px 0 0 0; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; color: #94a3b8;">Seller Approved</p>
                </div>
                
                <div style="padding: 24px; line-height: 1.5;">
                    <h2 style="color: #0f172a; font-size: 18px; margin-top: 0;">Dear ${sellerName},</h2>
                    <p>Welcome to <strong>Drapeit</strong>!</p>
                    
                    <div style="background-color: #f0fdf4; border-left: 4px solid #16a34a; padding: 12px; color: #14532d; border-radius: 4px; margin-bottom: 20px;">
                        Your store has been approved and is now live on the Drapeit marketplace!
                    </div>
                    
                    <p>At Drapeit, our mission is to connect quality products with customers through a seamless shopping experience. We look forward to a successful partnership.</p>
                    
                    <h3 style="color: #0f172a; font-size: 15px; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px; margin-top: 20px;">What's Next?</h3>
                    <ul style="padding-left: 20px; margin: 0 0 20px 0;">
                        <li style="margin-bottom: 8px;">Start uploading and managing your products through the seller dashboard.</li>
                        <li style="margin-bottom: 8px;">Keep your inventory and pricing updated to maximize visibility and sales.</li>
                        <li style="margin-bottom: 8px;">Monitor orders, performance metrics, and customer feedback in real time.</li>
                        <li style="margin-bottom: 8px;">Reach out to our support team whenever you need assistance.</li>
                    </ul>
                    
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="https://www.drapeit.in/login" style="background-color: #0f172a; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold; display: inline-block;">Login to Seller Portal</a>
                    </div>
                    
                    <p>Thank you for choosing Drapeit as your marketplace partner. We look forward to achieving great milestones together.</p>
                    <p style="margin-bottom: 0;">Warm regards,<br><strong>Team Drapeit</strong></p>
                </div>
            </div>
            `
    });

    console.log("Seller approval email sent: %s", info.messageId);
  } catch (error) {
    console.error("Error sending seller approval email:", error);
  }
};

export interface OrderEmailItem {
  productName: string;
  size: string;
  qty: number;
  price: number;
}

export interface NewOrderEmailDetails {
  sellerEmail: string;
  sellerName: string;
  orderId: number;
  buyerName: string;
  buyerPhone: string;
  shippingCity: string;
  shippingState: string;
  items: OrderEmailItem[];
  totalAmount: number;
}

export const sendNewOrderEmail = async (details: NewOrderEmailDetails) => {
  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: Number(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER || process.env.EMAIL_FROM,
        pass: process.env.SMTP_PASS, // User must provide this in .env
      },
    });

    const fromEmail = process.env.EMAIL_FROM || 'ranjitkumarbgs61@gmail.com';

    const itemsHtml = details.items
      .map(
        (item) => `
      <tr>
        <td style="padding: 12px; border-bottom: 1px solid #e2e8f0;">
          <div style="font-weight: bold; color: #1e293b;">${item.productName}</div>
          <div style="font-size: 12px; color: #64748b; margin-top: 4px;">Size: ${item.size || "N/A"}</div>
        </td>
        <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; text-align: center; color: #334155;">${item.qty}</td>
        <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; text-align: right; color: #334155;">₹${item.price}</td>
        <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; text-align: right; font-weight: bold; color: #0f172a;">₹${item.price * item.qty}</td>
      </tr>
    `
      )
      .join("");

    const info = await transporter.sendMail({
      from: `"Drapeit" <${fromEmail}>`,
      to: details.sellerEmail,
      subject: `New Order Received - Order #${details.orderId}`,
      text: `Dear ${details.sellerName},\n\nYou have received a new order!\n\nOrder ID: #${details.orderId}\nTotal Amount: ₹${details.totalAmount}\nCustomer: ${details.buyerName} (${details.buyerPhone})\nShipping Destination: ${details.shippingCity}, ${details.shippingState}\n\nPlease log in to the Seller Portal to manage this order: https://www.drapeit.in/login\n\nWarm regards,\nTeam Drapeit`,
      html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; color: #334155;">
        <div style="background-color: #0f172a; padding: 24px; text-align: center; color: #ffffff;">
          <h1 style="margin: 0; font-size: 24px;">Drapeit</h1>
          <p style="margin: 4px 0 0 0; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; color: #94a3b8;">New Order Notification</p>
        </div>
        
        <div style="padding: 24px; line-height: 1.5;">
          <h2 style="color: #0f172a; font-size: 18px; margin-top: 0;">Dear ${details.sellerName},</h2>
          <p>Great news! You have received a new order on Drapeit.</p>
          
          <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; padding: 16px; border-radius: 6px; margin-bottom: 24px;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 4px 0; color: #64748b;">Order ID:</td>
                <td style="padding: 4px 0; font-weight: bold; text-align: right;">#${details.orderId}</td>
              </tr>
              <tr>
                <td style="padding: 4px 0; color: #64748b;">Customer Name:</td>
                <td style="padding: 4px 0; font-weight: bold; text-align: right;">${details.buyerName}</td>
              </tr>
              <tr>
                <td style="padding: 4px 0; color: #64748b;">Customer Phone:</td>
                <td style="padding: 4px 0; font-weight: bold; text-align: right;">${details.buyerPhone}</td>
              </tr>
              <tr>
                <td style="padding: 4px 0; color: #64748b;">Delivery Destination:</td>
                <td style="padding: 4px 0; font-weight: bold; text-align: right;">${details.shippingCity}, ${details.shippingState}</td>
              </tr>
            </table>
          </div>
          
          <h3 style="color: #0f172a; font-size: 16px; margin-bottom: 12px; border-bottom: 2px solid #f1f5f9; padding-bottom: 6px;">Order Details</h3>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px; font-size: 14px;">
            <thead>
              <tr style="background-color: #f8fafc;">
                <th style="padding: 8px 12px; border-bottom: 2px solid #e2e8f0; text-align: left;">Product</th>
                <th style="padding: 8px 12px; border-bottom: 2px solid #e2e8f0; text-align: center;">Qty</th>
                <th style="padding: 8px 12px; border-bottom: 2px solid #e2e8f0; text-align: right;">Price</th>
                <th style="padding: 8px 12px; border-bottom: 2px solid #e2e8f0; text-align: right;">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
              <tr>
                <td colspan="3" style="padding: 12px; text-align: right; font-weight: bold; font-size: 16px;">Total Amount:</td>
                <td style="padding: 12px; text-align: right; font-weight: bold; font-size: 16px; color: #0f172a;">₹${details.totalAmount}</td>
              </tr>
            </tbody>
          </table>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="https://www.drapeit.in/login" style="background-color: #0f172a; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold; display: inline-block;">Login to Seller Portal</a>
          </div>
          
          <p>Please process this order promptly to maintain high merchant quality standards.</p>
          <p style="margin-bottom: 0;">Warm regards,<br><strong>Team Drapeit</strong></p>
        </div>
      </div>
      `,
    });

    console.log("New order email sent to seller: %s", info.messageId);
  } catch (error) {
    console.error("Error sending new order email to seller:", error);
  }
};




export const sendSellerRejectionEmail = async (email: string, sellerName: string, reason: string) => {
  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: Number(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER || process.env.EMAIL_FROM,
        pass: process.env.SMTP_PASS, // User must provide this in .env
      },
    });

    const fromEmail = process.env.EMAIL_FROM || 'ranjitkumarbgs61@gmail.com';

    const info = await transporter.sendMail({
      from: `"Drapeit" <${fromEmail}>`,
      to: email,
      subject: "Action Required: Update Your Seller Profile on Drapeit",
      text: `Dear ${sellerName},\n\nThank you for choosing Drapeit as your marketplace partner.\n\nWe have reviewed your seller profile and documents. Unfortunately, we are unable to approve your application at this time for the following reason:\n\n${reason}\n\nPlease log in to your Seller Portal to review and update your information or documents accordingly.\n\nLogin to Seller Portal: https://www.drapeit.in/login\n\nIf you need any assistance, feel free to reach out to our support team.\n\nWarm regards,\nTeam Drapeit`,
      html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; color: #334155;">
                <div style="background-color: #0f172a; padding: 24px; text-align: center; color: #ffffff;">
                    <h1 style="margin: 0; font-size: 24px;">Drapeit</h1>
                    <p style="margin: 4px 0 0 0; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; color: #94a3b8;">Action Required</p>
                </div>
                
                <div style="padding: 24px; line-height: 1.5;">
                    <h2 style="color: #0f172a; font-size: 18px; margin-top: 0;">Dear ${sellerName},</h2>
                    <p>Thank you for choosing <strong>Drapeit</strong> as your marketplace partner.</p>
                    
                    <p>We have reviewed your seller profile and documents. Unfortunately, we are unable to approve your application at this time for the following reason:</p>
 
                    <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 12px; color: #7f1d1d; border-radius: 4px; margin-bottom: 20px;">
                        <strong>Reason for Rejection:</strong><br>
                        ${reason}
                    </div>
                    
                    <p>Please log in to your Seller Portal to review and update your information or documents accordingly. Once updated, your profile will be re-evaluated by our team.</p>
                    
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="https://www.drapeit.in/login" style="background-color: #0f172a; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold; display: inline-block;">Login to Seller Portal</a>
                    </div>
                    
                    <p>If you need any assistance, feel free to reach out to our support team.</p>
                    <p style="margin-bottom: 0;">Warm regards,<br><strong>Team Drapeit</strong></p>
                </div>
            </div>
            `
    });

    console.log("Seller rejection email sent: %s", info.messageId);
  } catch (error) {
    console.error("Error sending seller rejection email:", error);
  }
};


export const sendEmailVerificationOTP = async (email: string, otp: string, phone_number?: string) => {
  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: Number(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER || process.env.EMAIL_FROM,
        pass: process.env.SMTP_PASS, // User must provide this in .env
      },
    });

    const fromEmail = process.env.EMAIL_FROM || 'ranjitkumarbgs61@gmail.com';

    const info = await transporter.sendMail({
      from: `"Drapeit" <${fromEmail}>`,
      to: email,
      subject: "Drapeit - Email Verification OTP",
      text: `Your OTP for email verification is ${otp}. It will expire in 5 minutes.`,
      html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; color: #334155;">
                <div style="background-color: #0f172a; padding: 24px; text-align: center; color: #ffffff;">
                    <h1 style="margin: 0; font-size: 24px;">Drapeit</h1>
                    <p style="margin: 4px 0 0 0; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; color: #94a3b8;">Email Verification</p>
                </div>
                
                <div style="padding: 24px; line-height: 1.5;">
                    <p>Dear Seller,</p>
                    <p>Use the following 6-digit OTP to verify your email address:</p>
                    <div style="background-color: #f1f5f9; padding: 12px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 4px; color: #0f172a; border-radius: 4px; margin: 20px 0;">
                        ${otp}
                    </div>
                    <p>This OTP is valid for 5 minutes. If you did not request this, please ignore this email.</p>
                    <p style="margin-bottom: 0;">Warm regards,<br><strong>Team Drapeit</strong></p>
                </div>
            </div>
      `
    });

    console.log("Email verification OTP sent: %s", info.messageId);
  } catch (error) {
    console.error("Error sending email verification OTP:", error);
  }
};
