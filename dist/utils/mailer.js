import dotenv from 'dotenv';
import nodemailer from 'nodemailer';
dotenv.config();
export const sendSellerOnboardEmail = async (details) => {
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
			text: `A new seller has just onboarded successfully to Drapeit.\n\nDetails:\nSeller Name: ${details.sellerName}\nStore Name: ${details.storeName}\nEmail: ${details.email || 'N/A'}\nPhone: ${details.phone || 'N/A'}\nAddress: ${details.address || 'N/A'}\n\nPlease review their details in the admin panel.`,
			html: `<p>A new seller has just onboarded successfully to Drapeit.</p>
            <ul>
                <li><strong>Seller Name:</strong> ${details.sellerName}</li>
                <li><strong>Store Name:</strong> ${details.storeName}</li>
                <li><strong>Email:</strong> ${details.email || 'N/A'}</li>
                <li><strong>Phone:</strong> ${details.phone || 'N/A'}</li>
                <li><strong>Address:</strong> ${details.address || 'N/A'}</li>
            </ul>
            <p>Please review their details in the admin panel.</p>`,
		});
		console.log("Seller onboard email sent: %s", info.messageId);
	}
	catch (error) {
		console.error("Error sending seller onboard email:", error);
	}
};
export const sendSellerWelcomeEmail = async (email, sellerName) => {
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
			text: `Dear ${sellerName},\n\nWe're thrilled to welcome you to Drapeit!\n\nYour onboarding has been successfully completed, and your documents are under review by our team. Your review process will be completed within 2 working days.\n\nAt Drapeit, we're building more than just a marketplace—we're creating a platform where brands, businesses, and customers connect through trust, quality, and innovation. We are excited to have your brand join us on this journey.\n\nAs a valued seller partner, you now have access to a growing customer base, powerful selling tools, and a dedicated team committed to helping your business succeed. Whether you're looking to increase visibility, expand your reach, or accelerate sales, Drapeit is here to support your growth every step of the way.\n\nHere's what you can do next:\n\n✓ Upload and showcase your products\n✓ Manage inventory and pricing effortlessly\n✓ Track orders and business performance in real time\n✓ Engage with customers and build lasting relationships\n\nWe believe great partnerships create extraordinary outcomes, and we're confident that together we can deliver exceptional experiences to customers while unlocking new opportunities for your business.\n\nThank you for placing your trust in Drapeit. We're excited to have you onboard and can't wait to see your success story unfold.\n\nWelcome to the future of smart commerce.\n\nWarm regards,\nTeam DrapeIt\n"Empowering Brands. Elevating Commerce."`,
			html: `
            <div style="font-family: 'Inter', Helvetica, Arial, sans-serif; background-color: #f8fafc; padding: 40px 20px; color: #1e293b; line-height: 1.6;">
                <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03); overflow: hidden; border: 1px solid #e2e8f0;">
                    <!-- Header -->
                    <div style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); padding: 35px 40px; text-align: center;">
                        <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 700; letter-spacing: -0.025em;">Drapeit</h1>
                        <p style="color: #94a3b8; margin: 5px 0 0 0; font-size: 14px; letter-spacing: 0.05em; text-transform: uppercase;">Seller Portal</p>
                    </div>
                    
                    <!-- Content -->
                    <div style="padding: 40px;">
                        <h2 style="color: #0f172a; margin-top: 0; font-size: 20px; font-weight: 600; line-height: 1.3;">Dear ${sellerName},</h2>
                        
                        <p style="font-size: 16px; color: #334155; margin-bottom: 24px;">We're thrilled to welcome you to <strong>Drapeit</strong>!</p>
                        
                        <div style="background-color: #f0fdf4; border-left: 4px solid #16a34a; padding: 16px 20px; border-radius: 4px; margin-bottom: 24px;">
                            <p style="margin: 0; font-size: 15px; color: #14532d; font-weight: 500;">
                                Your onboarding has been successfully completed, and your documents are under review by our team. Your review process will be completed within 2 working days.
                            </p>
                        </div>
                        
                        <p style="font-size: 15px; color: #334155; margin-bottom: 20px;">
                            At Drapeit, we're building more than just a marketplace&mdash;we're creating a platform where brands, businesses, and customers connect through trust, quality, and innovation. We are excited to have your brand join us on this journey.
                        </p>
                        
                        <p style="font-size: 15px; color: #334155; margin-bottom: 24px;">
                            As a valued seller partner, you now have access to a growing customer base, powerful selling tools, and a dedicated team committed to helping your business succeed. Whether you're looking to increase visibility, expand your reach, or accelerate sales, Drapeit is here to support your growth every step of the way.
                        </p>
                        
                        <h3 style="color: #0f172a; font-size: 16px; font-weight: 600; margin-bottom: 16px; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px;">Here's what you can do next:</h3>
                        
                        <table style="width: 100%; border-collapse: collapse; margin-bottom: 28px;">
                            <tr>
                                <td style="vertical-align: top; width: 28px; padding-bottom: 12px; color: #16a34a; font-size: 18px; font-weight: bold;">✓</td>
                                <td style="padding-bottom: 12px; font-size: 15px; color: #475569;">Upload and showcase your products</td>
                            </tr>
                            <tr>
                                <td style="vertical-align: top; width: 28px; padding-bottom: 12px; color: #16a34a; font-size: 18px; font-weight: bold;">✓</td>
                                <td style="padding-bottom: 12px; font-size: 15px; color: #475569;">Manage inventory and pricing effortlessly</td>
                            </tr>
                            <tr>
                                <td style="vertical-align: top; width: 28px; padding-bottom: 12px; color: #16a34a; font-size: 18px; font-weight: bold;">✓</td>
                                <td style="padding-bottom: 12px; font-size: 15px; color: #475569;">Track orders and business performance in real time</td>
                            </tr>
                            <tr>
                                <td style="vertical-align: top; width: 28px; padding-bottom: 12px; color: #16a34a; font-size: 18px; font-weight: bold;">✓</td>
                                <td style="padding-bottom: 12px; font-size: 15px; color: #475569;">Engage with customers and build lasting relationships</td>
                            </tr>
                        </table>
                        
                        <p style="font-size: 15px; color: #334155; margin-bottom: 24px;">
                            We believe great partnerships create extraordinary outcomes, and we're confident that together we can deliver exceptional experiences to customers while unlocking new opportunities for your business.
                        </p>
                        
                        <p style="font-size: 15px; color: #334155; margin-bottom: 30px;">
                            Thank you for placing your trust in Drapeit. We're excited to have you onboard and can't wait to see your success story unfold.
                        </p>
                        
                        <p style="font-size: 16px; font-weight: 600; color: #0f172a; margin: 0 0 4px 0;">Welcome to the future of smart commerce.</p>
                    </div>
                    
                    <!-- Footer -->
                    <div style="background-color: #f1f5f9; padding: 30px 40px; text-align: center; border-top: 1px solid #e2e8f0;">
                        <p style="margin: 0; font-size: 15px; font-weight: 600; color: #334155;">Warm regards,</p>
                        <p style="margin: 4px 0; font-size: 16px; font-weight: 700; color: #0f172a;">Team Drapeit</p>
                        <p style="margin: 8px 0 0 0; font-size: 13px; color: #64748b; font-style: italic;">"Empowering Brands. Elevating Commerce."</p>
                    </div>
                </div>
            </div>
            `
		});
		console.log("Seller welcome email sent: %s", info.messageId);
	}
	catch (error) {
		console.error("Error sending seller welcome email:", error);
	}
};
export const sendSellerApprovalEmail = async (email, sellerName) => {
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
			text: `Dear ${sellerName},\n\nWelcome to Drapeit!\n\nWe are excited to have you join our growing community of trusted sellers. Your review process has been successfully completed, and your store is now part of the Drapeit marketplace.\n\nAt Drapeit, our mission is to connect quality products with customers through a seamless shopping experience. We believe your brand and offerings will add tremendous value to our platform, and we look forward to building a successful partnership together.\n\nWhat's Next?\n\n• Start uploading and managing your products through the seller dashboard.\n• Keep your inventory and pricing updated to maximize visibility and sales.\n• Monitor orders, performance metrics, and customer feedback in real time.\n• Reach out to our support team whenever you need assistance.\n\nOur team is committed to supporting your growth and helping you reach more customers. Together, we can create an exceptional shopping experience and drive meaningful business success.\n\nThank you for choosing Drapeit as your marketplace partner. We are thrilled to have you onboard and look forward to achieving great milestones together.\n\nWarm regards,\nTeam Drapeit`,
			html: `
            <div style="font-family: 'Inter', Helvetica, Arial, sans-serif; background-color: #f8fafc; padding: 40px 20px; color: #1e293b; line-height: 1.6;">
                <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03); overflow: hidden; border: 1px solid #e2e8f0;">
                    <!-- Header -->
                    <div style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); padding: 35px 40px; text-align: center;">
                        <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 700; letter-spacing: -0.025em;">Drapeit</h1>
                        <p style="color: #94a3b8; margin: 5px 0 0 0; font-size: 14px; letter-spacing: 0.05em; text-transform: uppercase;">Seller Approved</p>
                    </div>
                    
                    <!-- Content -->
                    <div style="padding: 40px;">
                        <h2 style="color: #0f172a; margin-top: 0; font-size: 20px; font-weight: 600; line-height: 1.3;">Dear ${sellerName},</h2>
                        
                        <p style="font-size: 16px; color: #334155; margin-bottom: 24px;">Welcome to <strong>Drapeit</strong>!</p>
                        
                        <div style="background-color: #f0fdf4; border-left: 4px solid #16a34a; padding: 16px 20px; border-radius: 4px; margin-bottom: 24px;">
                            <p style="margin: 0; font-size: 15px; color: #14532d; font-weight: 500;">
                                We are excited to have you join our growing community of trusted sellers. Your review process has been successfully completed, and your store is now part of the Drapeit marketplace.
                            </p>
                        </div>
                        
                        <p style="font-size: 15px; color: #334155; margin-bottom: 24px;">
                            At Drapeit, our mission is to connect quality products with customers through a seamless shopping experience. We believe your brand and offerings will add tremendous value to our platform, and we look forward to building a successful partnership together.
                        </p>
                        
                        <h3 style="color: #0f172a; font-size: 16px; font-weight: 600; margin-bottom: 16px; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px;">What's Next?</h3>
                        
                        <table style="width: 100%; border-collapse: collapse; margin-bottom: 28px;">
                            <tr>
                                <td style="vertical-align: top; width: 24px; padding-bottom: 12px; color: #16a34a; font-size: 18px; font-weight: bold;">•</td>
                                <td style="padding-bottom: 12px; font-size: 15px; color: #475569;">Start uploading and managing your products through the seller dashboard.</td>
                            </tr>
                            <tr>
                                <td style="vertical-align: top; width: 24px; padding-bottom: 12px; color: #16a34a; font-size: 18px; font-weight: bold;">•</td>
                                <td style="padding-bottom: 12px; font-size: 15px; color: #475569;">Keep your inventory and pricing updated to maximize visibility and sales.</td>
                            </tr>
                            <tr>
                                <td style="vertical-align: top; width: 24px; padding-bottom: 12px; color: #16a34a; font-size: 18px; font-weight: bold;">•</td>
                                <td style="padding-bottom: 12px; font-size: 15px; color: #475569;">Monitor orders, performance metrics, and customer feedback in real time.</td>
                            </tr>
                            <tr>
                                <td style="vertical-align: top; width: 24px; padding-bottom: 12px; color: #16a34a; font-size: 18px; font-weight: bold;">•</td>
                                <td style="padding-bottom: 12px; font-size: 15px; color: #475569;">Reach out to our support team whenever you need assistance.</td>
                            </tr>
                        </table>
                        
                        <p style="font-size: 15px; color: #334155; margin-bottom: 24px;">
                            Our team is committed to supporting your growth and helping you reach more customers. Together, we can create an exceptional shopping experience and drive meaningful business success.
                        </p>
                        
                        <p style="font-size: 15px; color: #334155; margin-bottom: 30px;">
                            Thank you for choosing Drapeit as your marketplace partner. We are thrilled to have you onboard and look forward to achieving great milestones together.
                        </p>
                    </div>
                    
                    <!-- Footer -->
                    <div style="background-color: #f1f5f9; padding: 30px 40px; text-align: center; border-top: 1px solid #e2e8f0;">
                        <p style="margin: 0; font-size: 15px; font-weight: 600; color: #334155;">Warm regards,</p>
                        <p style="margin: 4px 0; font-size: 16px; font-weight: 700; color: #0f172a;">Team Drapeit</p>
                    </div>
                </div>
            </div>
            `
		});
		console.log("Seller approval email sent: %s", info.messageId);
	}
	catch (error) {
		console.error("Error sending seller approval email:", error);
	}
};
