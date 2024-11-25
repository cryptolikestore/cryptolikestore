// استيراد المكتبات اللازمة
const express = require('express');
const bodyParser = require('body-parser');
const nodemailer = require('nodemailer');
const fs = require('fs');
const app = express();

// تكوين المنفذ
const PORT = process.env.PORT || 3000;

// إعدادات البريد الإلكتروني باستخدام nodemailer
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'cryptolikestore@gmail.com', // ضع بريدك هنا
    pass: '@11223344Ss' // ضع كلمة مرور بريدك
  }
});

// استخدم bodyParser لتحليل بيانات JSON القادمة من PayPal
app.use(bodyParser.json());

// إعداد نقطة نهاية Webhook التي ستستقبل إشعارات PayPal
app.post('/paypal/webhook', (req, res) => {
  const webhookEvent = req.body;

  console.log("Webhook received:", webhookEvent);

  // تحقق من نوع الحدث من PayPal
  if (webhookEvent.event_type === 'PAYMENT.SALE.COMPLETED') {
    // الحصول على تفاصيل الدفع
    const paymentAmount = parseFloat(webhookEvent.resource.amount.total); // مبلغ الدفع
    const email = webhookEvent.resource.payer.email_address; // البريد الإلكتروني للمستخدم

    // اختر رمز بطاقة يتوافق مع المبلغ المدفوع
    const giftCardCode = generateGiftCardCode(paymentAmount);

    if (giftCardCode) {
      // إرسال البريد الإلكتروني للمشتري مع رمز البطاقة
      const mailOptions = {
        from: 'cryptolikestore@gmail.com', // البريد الإلكتروني من الذي سترسل منه
        to: email,
        subject: 'Your Gift Card Purchase',
        text: `Thank you for your purchase of $${paymentAmount}! Here is your gift card code: ${giftCardCode}`
      };

      transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
          console.log('Error sending email:', error);
          return res.status(500).send('Internal Server Error');
        }
        console.log('Email sent: ' + info.response);
        return res.status(200).send('Webhook received');
      });
    } else {
      return res.status(400).send('No available gift card for this amount');
    }
  } else {
    return res.status(200).send('Event type not handled');
  }
});

// دالة لاختيار رمز بطاقة يتوافق مع المبلغ المدفوع
function generateGiftCardCode(paymentAmount) {
  const giftCardsData = JSON.parse(fs.readFileSync('giftCards.json')); // قراءة البيانات من ملف JSON
  const availableCard = giftCardsData.giftCards.find(card => card.status === 'available' && card.price === paymentAmount);
  
  if (availableCard) {
    // تحديث حالة البطاقة لتصبح "مستخدمة"
    availableCard.status = 'used';
    fs.writeFileSync('giftCards.json', JSON.stringify(giftCardsData, null, 2)); // حفظ التغييرات في الملف
    return availableCard.code;
  }
  return null;
}

// بدء الخادم
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
