const PDFDocument = require('pdfkit');
const supabase = require('../config/supabase');

async function pdfGenerator(order) {
    return new Promise((resolve, reject) => {
        try {
            const doc = new PDFDocument();

            const buffers = [];
            doc.on('data', buffers.push.bind(buffers));

            doc.on('end', async () => {
                try {
                    const pdfBuffer = Buffer.concat(buffers);

                    const fileName = `invoice-${order.id}.pdf`;

                    // 📤 Upload to Supabase Storage
                    const { error } = await supabase.storage
                        .from('invoices') // bucket name
                        .upload(fileName, pdfBuffer, {
                            contentType: 'application/pdf',
                            upsert: true
                        });

                    if (error) throw error;

                    // 🔗 Get public URL
                    const { data } = supabase.storage
                        .from('invoices')
                        .getPublicUrl(fileName);

                    resolve(data.publicUrl);

                } catch (err) {
                    reject(err);
                }
            });

            // 🧾 PDF Content
            doc.fontSize(20).text("INVOICE", { align: "center" });
            doc.moveDown();

            doc.text(`Order ID: ${order.id}`);
            doc.text(`Date: ${new Date(order.created_at).toDateString()}`);
            doc.moveDown();

            doc.text(`Items: ${order.products.name}`);
            doc.moveDown();

            doc.text(`Total: ₹${order.total_price}`);

            doc.end();

        } catch (err) {
            reject(err);
        }
    });
}

module.exports = { pdfGenerator };