const QRCode = require('qrcode');
const fs = require('fs');

const codes = [
  'QR_RECYCLE_PLASTIC_001', 'QR_TRANSPORT_BIKE_001', 'QR_RECYCLE_PAPER_001',
  'QR_REUSABLE_BOTTLE_001', 'QR_PLANT_TREE_001', 'QR_SAVE_ENERGY_001',
  'QR_RECYCLE_BATTERY_001', 'QR_ATTEND_TALK_001', 'QR_CARPOOL_001',
  'QR_NO_PRINT_001', 'QR_RECYCLE_EWASTE_001', 'QR_CAMPUS_CLEANUP_001'
];

async function generateQRs() {
    try {
        for (const code of codes) {
            await QRCode.toFile(`../${code}.png`, code, {
                color: { dark: '#000000', light: '#FFFFFF' },
                width: 500
            });
            console.log(`Generado: ${code}.png`);
        }
    } catch (err) {
        console.error(err);
    }
}

generateQRs();
