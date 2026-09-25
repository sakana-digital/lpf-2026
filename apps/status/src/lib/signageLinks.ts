import hpQr from '@/assets/qr-hp.png'
import instagramQr from '@/assets/qr-instagram.png'

/** Where the signage sends visitors, shown as QR codes over the video. */
export const SIGNAGE_LINKS = [
  { label: '公式サイト', qr: hpQr },
  { label: 'Instagram', qr: instagramQr },
] as const
