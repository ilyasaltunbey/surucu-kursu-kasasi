# Sürücü Kursu Kasası

Bu proje Supabase veritabanına bağlı, React ile yazılmış bir gelir-gider takip uygulamasıdır.

## Kurulum (kendi bilgisayarında denemek için)

```
npm install
npm run dev
```

## Canlıya Alma (Vercel ile - ücretsiz)

1. Bu klasörü bir GitHub deposuna yükle (GitHub Desktop veya web arayüzü ile)
2. https://vercel.com adresine git, GitHub ile giriş yap
3. "Add New Project" → GitHub deposunu seç
4. "Deploy" butonuna bas — Vercel otomatik olarak Vite projesini tanır ve derler
5. Birkaç dakika içinde sana bir link verir (örn: `surucu-kursu-kasasi.vercel.app`)

Bu linki sen, sekreterin ve diğer cihazların kullanabilir.

## Notlar

- Supabase bağlantı bilgileri `src/supabaseClient.js` içinde tanımlı
- PIN: 1234 (rapor ekranına erişim için) — bunu kalıcı olarak değiştirmek istersen kodda `RAPOR_PIN` değişkenini güncelle
- Eğitmen, araç, personel listeleri `src/App.jsx` dosyasının başındaki sabitlerde tanımlı
