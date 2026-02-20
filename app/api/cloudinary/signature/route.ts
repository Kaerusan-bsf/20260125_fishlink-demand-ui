import {NextResponse} from 'next/server';
import crypto from 'crypto';

const FOLDER = 'fishlink/listings';

export async function GET() {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    return NextResponse.json({error: 'not_configured'}, {status: 400});
  }

  const timestamp = Math.floor(Date.now() / 1000);
  const payload = `folder=${FOLDER}&timestamp=${timestamp}`;
  const signature = crypto.createHash('sha1').update(payload + apiSecret).digest('hex');

  return NextResponse.json({
    cloudName,
    apiKey,
    timestamp,
    signature,
    folder: FOLDER
  });
}
