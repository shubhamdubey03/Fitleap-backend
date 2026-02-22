const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

async function pdfGenerator(order, filePath) {
    console.log(";;;;;;;;;;", order)
    return new Promise((resolve, reject) => {

        const dir = path.dirname(filePath);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir);

        const doc = new PDFDocument();
        const stream = fs.createWriteStream(filePath);

        doc.pipe(stream);

        doc.fontSize(20).text("INVOICE", { align: "center" });
        doc.moveDown();

        doc.text(`Order ID: ${order.id}`);
        doc.text(`Date: ${new Date(order.created_at).toDateString()}`);
        doc.moveDown();

        doc.text("Items:");

        // order.items.forEach(item => {
        //     doc.text(`${item.product.name} x${item.qty} - ₹${item.price}`);
        // });

        doc.moveDown();
        doc.text(`Total: ₹${order.total_price}`);

        doc.end();

        stream.on("finish", resolve);
        stream.on("error", reject);
    });
}


module.exports = { pdfGenerator };   