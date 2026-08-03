import React, { useState, useMemo, useEffect } from 'react';
import {
  Plus, TrendingUp, TrendingDown, Trash2, Wallet, Calendar, ChevronLeft, ChevronRight,
  Car, Receipt, Banknote, CreditCard, ArrowLeftRight, Lock, Unlock, ArrowRight, Eye, EyeOff, X, BarChart3
} from 'lucide-react';
import { supabase } from './supabaseClient';

const VARSAYILAN_EGITMENLER = [
  { id: 'meryem', isim: 'Meryem İnli' },
  { id: 'gulsen', isim: 'Gülsen Kahraman' },
  { id: 'ahmet', isim: 'Ahmet Önür' },
];

const VARSAYILAN_ARACLAR = [
  { id: 'sk', isim: '34 SK' },
  { id: 'bhh', isim: '34 BHH' },
  { id: 'hge', isim: '34 HGE' },
];

const VARSAYILAN_PERSONEL = [
  { id: 'sevgi', isim: 'Sevgi Karakuş', gorev: 'Müdür' },
  { id: 'gulten', isim: 'Gülten Hanım', gorev: 'Temizlikçi' },
  { id: 'sercan', isim: 'Sercan Polat', gorev: 'Motosiklet Hocası' },
  { id: 'meryem_p', isim: 'Meryem İnli', gorev: 'Direksiyon Hocası' },
  { id: 'gulsen_p', isim: 'Gülsen Kahraman', gorev: 'Direksiyon Hocası' },
  { id: 'ahmet_p', isim: 'Ahmet Önür', gorev: 'Direksiyon Hocası' },
  { id: 'parttime', isim: 'Part-Time Hoca (isim belirt)', gorev: 'Serbest' },
];

// Her sınav tarihi kaydı: { id, etiket: "27-28 Ağustos", tarih: "2026-08-28" (son gün, geçmiş kontrolü için) }
const VARSAYILAN_SINAV_TARIHLERI = [];

// Rutin ödemeler: her ay belirli günlerde yapılan sabit ödemeler
// { id, isim, tutar, gun (ayın kaçında), kategori }
const VARSAYILAN_RUTIN_ODEMELER = [
  { id: 'kira', isim: 'Kira', tutar: 0, gun: 1, kategori: 'kira' },
  { id: 'sgk', isim: 'SGK Ödemesi', tutar: 0, gun: 20, kategori: 'sgk' },
  { id: 'personel', isim: 'Personel Maaşları', tutar: 0, gun: 1, kategori: 'personel' },
];

const depoYukle = (anahtar, varsayilan) => {
  try {
    const veri = localStorage.getItem(anahtar);
    return veri ? JSON.parse(veri) : varsayilan;
  } catch {
    return varsayilan;
  }
};

const depoKaydet = (anahtar, deger) => {
  try {
    localStorage.setItem(anahtar, JSON.stringify(deger));
  } catch {}
};

// sistem: true olan kategorilere doğrudan hesap mantığı bağlıdır (harç bölüşümü, özel ders,
// kişisel/geçici çekim, transferler, harç ödemesi, devreden bakiye). Bunların id'si SABİTTİR ve
// silinemez; sadece görünen adı değiştirilebilir. Diğerleri serbestçe düzenlenebilir/gizlenebilir.
const VARSAYILAN_GELIR_KATEGORILERI = [
  { id: 'kursiyer', isim: 'Kursiyer Ödemesi' },
  { id: 'ikinci_dosya', isim: '2. Direksiyon Dosyası' },
  { id: 'ozel_ders', isim: 'Özel Ders', sistem: true },
  { id: 'harc', isim: 'Harç Geliri', sistem: true },
  { id: 'komisyon', isim: 'Komisyon Geliri' },
  { id: 'devreden_bakiye', isim: 'Devreden Bakiye (Başlangıç)', sistem: true },
  { id: 'transfer_gelen', isim: 'Kasa İçi Transfer (Gelen)', sistem: true },
];

const VARSAYILAN_GIDER_KATEGORILERI = [
  { id: 'kira', isim: 'Kira' },
  { id: 'personel', isim: 'Personel Maaşı', sistem: true },
  { id: 'yakit', isim: 'Yakıt' },
  { id: 'bakim', isim: 'Arıza/Tamir' },
  { id: 'yikama', isim: 'Yıkama' },
  { id: 'sgk', isim: 'SGK Ödemesi' },
  { id: 'vergi', isim: 'Vergi Ödemesi' },
  { id: 'mutfak', isim: 'Mutfak/Temizlik/Kırtasiye' },
  { id: 'faturalar', isim: 'Faturalar (Elektrik/Su/İnternet)' },
  { id: 'reklam', isim: 'Reklam' },
  { id: 'harc_odeme', isim: 'Harç Ödemesi (Devlete)', sistem: true },
  { id: 'kisisel', isim: 'Kişisel Çekim', sistem: true },
  { id: 'gecici_cekim', isim: 'Geçici Çekim / Avans', sistem: true },
  { id: 'transfer_giden', isim: 'Kasa İçi Transfer (Giden)', sistem: true },
  { id: 'diger', isim: 'Diğer' },
];

// Kayıtlı kategori listesini varsayılanlarla birleştirir:
// - Sistem/yerleşik kategoriler HER ZAMAN garanti edilir (kullanıcı ismini korur, gizli bayrağını korur).
// - Kullanıcının eklediği özel kategoriler (ozel: true) korunur.
// Bu sayede ileride koda yeni sistem kategorisi eklense bile kayıtlı verilerde kaybolmaz.
const kategorileriBirlestir = (kayitli, varsayilan) => {
  if (!Array.isArray(kayitli) || kayitli.length === 0) return varsayilan.map((k) => ({ ...k, gizli: false }));
  const kayitliMap = {};
  kayitli.forEach((k) => { if (k && k.id) kayitliMap[k.id] = k; });
  const sonuc = [];
  const eklenen = new Set();
  varsayilan.forEach((v) => {
    const m = kayitliMap[v.id];
    sonuc.push({ ...v, isim: (m && m.isim) ? m.isim : v.isim, gizli: !!(m && m.gizli) });
    eklenen.add(v.id);
  });
  kayitli.forEach((k) => {
    if (k && k.id && !eklenen.has(k.id)) {
      sonuc.push({ id: k.id, isim: k.isim || k.id, gizli: !!k.gizli, ozel: true });
      eklenen.add(k.id);
    }
  });
  return sonuc;
};

const ODEME_TIPLERI = [
  { id: 'nakit', isim: 'Nakit', icon: Banknote },
  { id: 'havale', isim: 'Havale/EFT', icon: ArrowLeftRight },
  { id: 'pos', isim: 'Kredi Kartı/POS', icon: CreditCard },
];

const ISLEM_YAPAN = [
  { id: 'ilyas', isim: 'İlyas Bey' },
  { id: 'sevgi', isim: 'Sevgi Hanım' },
];

const VARSAYILAN_RAPOR_PIN = '1234';

const bugun = () => {
  const d = new Date();
  const yil = d.getFullYear();
  const ay = String(d.getMonth() + 1).padStart(2, '0');
  const gun = String(d.getDate()).padStart(2, '0');
  return `${yil}-${ay}-${gun}`;
};
const ayAdi = (tarih) => new Date(tarih).toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' });
const ayAnahtari = (tarih) => tarih.slice(0, 7);
const fmt = (n) => (n || 0).toLocaleString('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + ' ₺';

// Bir kaydın FİNANSAL/KASA tarihi: para fiilen ne zaman kasaya girdiyse o gün.
// Veresiye harç sonradan ödendiğinde odemeTarihi dolar; günlük/aylık özet ve kasa
// hareketleri bu tarihe göre hesaplanır (kaydın giriş tarihine değil). Diğer tüm
// kayıtlarda odemeTarihi boştur ve kendi tarihi kullanılır.
const etkinTarih = (k) => k.odemeTarihi || k.tarih;
const gunSayisi = (ayKey) => {
  const [yil, ay] = ayKey.split('-').map(Number);
  return new Date(yil, ay, 0).getDate();
};
const katAdi = (id, liste) => liste.find((x) => x.id === id)?.isim || id;

// ---- Palette ----
const C = {
  // Lacivert-beyaz tema
  bg: '#F5F7FA',              // ana zemin - açık gri-beyaz
  panel: '#FFFFFF',            // kart zemin - beyaz
  panelAlt: '#F8FAFC',         // ikincil kart zemin
  border: '#E2E8F0',           // ince kenar
  borderLight: '#CBD5E1',      // vurgulu kenar
  text: '#0A2540',             // ana yazı - koyu lacivert
  textDim: '#475569',          // ikincil yazı
  textFaint: '#94A3B8',        // soluk yazı / placeholder
  mint: '#059669',             // pozitif / gelir - yeşil
  mintDeep: '#047857',
  gold: '#D97706',             // uyarı / veresiye - kehribar
  rose: '#DC2626',             // negatif / gider - kırmızı
  roseDeep: '#991B1B',
  blue: '#0A2540',             // ana lacivert
  blueDeep: '#1E3A5F',         // koyu lacivert (gradient için)
  blueAccent: '#3B82F6',       // aksan mavisi
};

const FONT_IMPORT = (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;700;800&family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@500;700;800&display=swap');
    .scka-display { font-family: 'Space Grotesk', sans-serif; }
    .scka-mono { font-family: 'JetBrains Mono', monospace; }
    @keyframes scka-pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.55; } }
    @keyframes scka-rise { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
    .scka-card { animation: scka-rise 0.35s ease-out; }
    input, select, textarea { color: #0A2540 !important; background: #FFFFFF !important; }
    input::placeholder { color: #94A3B8 !important; }
  `}</style>
);

// ---- Supabase satır <-> uygulama kaydı dönüşümü ----
const dbdenKayit = (r) => ({
  id: r.id,
  tip: r.tip,
  tarih: r.tarih,
  aciklama: r.aciklama,
  kategori: r.kategori,
  tutar: Number(r.tutar),
  kalan: Number(r.kalan),
  egitmen: r.egitmen || '',
  arac: r.arac || '',
  odeme: r.odeme,
  islemYapan: r.islem_yapan || '',
  not: r.not_metni || '',
  sinavTarihi: r.sinav_tarihi || '',
  odendiMi: r.odendi_mi !== false,
  // Veresiye harç ödendi olarak işaretlendiğinde paranın fiilen kasaya girdiği gün.
  // Boşsa kayıt kendi tarihine göre değerlendirilir.
  odemeTarihi: r.odeme_tarihi || '',
});

const kayitToDb = (k) => ({
  tip: k.tip,
  tarih: k.tarih,
  aciklama: k.aciklama,
  kategori: k.kategori,
  tutar: k.tutar,
  kalan: k.kalan,
  egitmen: k.egitmen || null,
  arac: k.arac || null,
  odeme: k.odeme,
  islem_yapan: k.islemYapan || null,
  not_metni: k.not || null,
  sinav_tarihi: k.sinavTarihi || null,
  odendi_mi: k.odendiMi !== false,
  odeme_tarihi: k.odemeTarihi || null,
});

export default function MuhasebeApp() {
  const [kayitlar, setKayitlar] = useState([]);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [hataMesaji, setHataMesaji] = useState(null);

  // Eğitmen / Araç / Personel / Sınav Tarihleri listeleri: Supabase 'ayarlar' tablosunda saklanır (tüm cihazlarda ortak)
  const [EGITMENLER, setEGITMENLER] = useState(() => depoYukle('skk_egitmenler', VARSAYILAN_EGITMENLER));
  const [ARACLAR, setARACLAR] = useState(() => depoYukle('skk_araclar', VARSAYILAN_ARACLAR));
  const [PERSONEL, setPERSONEL] = useState(() => depoYukle('skk_personel', VARSAYILAN_PERSONEL));
  const [SINAV_TARIHLERI, setSINAV_TARIHLERI] = useState(() => depoYukle('skk_sinav_tarihleri', VARSAYILAN_SINAV_TARIHLERI));
  const [RUTIN_ODEMELER, setRUTIN_ODEMELER] = useState(() => depoYukle('skk_rutin_odemeler', VARSAYILAN_RUTIN_ODEMELER));
  const [DEVLET_HARC_SABIT, setDEVLET_HARC_SABIT] = useState(() => depoYukle('skk_devlet_harc_sabit', 2000));
  const [RAPOR_PIN, setRAPOR_PIN] = useState(() => depoYukle('skk_rapor_pin', VARSAYILAN_RAPOR_PIN));
  const [GELIR_KATEGORILERI, setGELIR_KATEGORILERI] = useState(() => kategorileriBirlestir(depoYukle('skk_gelir_kategorileri', VARSAYILAN_GELIR_KATEGORILERI), VARSAYILAN_GELIR_KATEGORILERI));
  const [GIDER_KATEGORILERI, setGIDER_KATEGORILERI] = useState(() => kategorileriBirlestir(depoYukle('skk_gider_kategorileri', VARSAYILAN_GIDER_KATEGORILERI), VARSAYILAN_GIDER_KATEGORILERI));
  const ayarlarYuklendi = React.useRef(false);

  // İlk yüklemede Supabase'den ayarları çek (yoksa varsayılanları oraya yaz)
  useEffect(() => {
    const ayarlariYukle = async () => {
      const { data, error } = await supabase.from('ayarlar').select('*');
      if (error || !data) { ayarlarYuklendi.current = true; return; }

      const map = {};
      data.forEach((row) => { map[row.id] = row.veri; });

      if (map.egitmenler) setEGITMENLER(map.egitmenler);
      else await supabase.from('ayarlar').upsert({ id: 'egitmenler', veri: VARSAYILAN_EGITMENLER });

      if (map.araclar) setARACLAR(map.araclar);
      else await supabase.from('ayarlar').upsert({ id: 'araclar', veri: VARSAYILAN_ARACLAR });

      if (map.personel) setPERSONEL(map.personel);
      else await supabase.from('ayarlar').upsert({ id: 'personel', veri: VARSAYILAN_PERSONEL });

      if (map.sinav_tarihleri) setSINAV_TARIHLERI(map.sinav_tarihleri);
      else await supabase.from('ayarlar').upsert({ id: 'sinav_tarihleri', veri: VARSAYILAN_SINAV_TARIHLERI });

      if (map.rutin_odemeler) setRUTIN_ODEMELER(map.rutin_odemeler);
      else await supabase.from('ayarlar').upsert({ id: 'rutin_odemeler', veri: VARSAYILAN_RUTIN_ODEMELER });

      if (map.devlet_harc_sabit !== undefined) setDEVLET_HARC_SABIT(map.devlet_harc_sabit);
      else await supabase.from('ayarlar').upsert({ id: 'devlet_harc_sabit', veri: 2000 });

      if (map.rapor_pin) setRAPOR_PIN(map.rapor_pin);
      else await supabase.from('ayarlar').upsert({ id: 'rapor_pin', veri: VARSAYILAN_RAPOR_PIN });

      if (map.gelir_kategorileri) setGELIR_KATEGORILERI(kategorileriBirlestir(map.gelir_kategorileri, VARSAYILAN_GELIR_KATEGORILERI));
      else await supabase.from('ayarlar').upsert({ id: 'gelir_kategorileri', veri: VARSAYILAN_GELIR_KATEGORILERI });

      if (map.gider_kategorileri) setGIDER_KATEGORILERI(kategorileriBirlestir(map.gider_kategorileri, VARSAYILAN_GIDER_KATEGORILERI));
      else await supabase.from('ayarlar').upsert({ id: 'gider_kategorileri', veri: VARSAYILAN_GIDER_KATEGORILERI });

      ayarlarYuklendi.current = true;
    };
    ayarlariYukle();
  }, []);

  // Değişiklik olunca Supabase'e ve yerel önbelleğe kaydet (ilk yükleme tamamlanmadan kaydetme)
  useEffect(() => {
    if (!ayarlarYuklendi.current) return;
    depoKaydet('skk_egitmenler', EGITMENLER);
    supabase.from('ayarlar').upsert({ id: 'egitmenler', veri: EGITMENLER }).then(({ error }) => {
      if (error) setHataMesaji('Eğitmen listesi kaydedilemedi: ' + error.message);
    });
  }, [EGITMENLER]);

  useEffect(() => {
    if (!ayarlarYuklendi.current) return;
    depoKaydet('skk_araclar', ARACLAR);
    supabase.from('ayarlar').upsert({ id: 'araclar', veri: ARACLAR }).then(({ error }) => {
      if (error) setHataMesaji('Araç listesi kaydedilemedi: ' + error.message);
    });
  }, [ARACLAR]);

  useEffect(() => {
    if (!ayarlarYuklendi.current) return;
    depoKaydet('skk_personel', PERSONEL);
    supabase.from('ayarlar').upsert({ id: 'personel', veri: PERSONEL }).then(({ error }) => {
      if (error) setHataMesaji('Personel listesi kaydedilemedi: ' + error.message);
    });
  }, [PERSONEL]);

  useEffect(() => {
    if (!ayarlarYuklendi.current) return;
    depoKaydet('skk_sinav_tarihleri', SINAV_TARIHLERI);
    supabase.from('ayarlar').upsert({ id: 'sinav_tarihleri', veri: SINAV_TARIHLERI }).then(({ error }) => {
      if (error) setHataMesaji('Sınav tarihleri kaydedilemedi: ' + error.message);
    });
  }, [SINAV_TARIHLERI]);

  useEffect(() => {
    if (!ayarlarYuklendi.current) return;
    depoKaydet('skk_devlet_harc_sabit', DEVLET_HARC_SABIT);
    supabase.from('ayarlar').upsert({ id: 'devlet_harc_sabit', veri: DEVLET_HARC_SABIT }).then(({ error }) => {
      if (error) setHataMesaji('Devlet harç tutarı kaydedilemedi: ' + error.message);
    });
  }, [DEVLET_HARC_SABIT]);

  useEffect(() => {
    if (!ayarlarYuklendi.current) return;
    depoKaydet('skk_rutin_odemeler', RUTIN_ODEMELER);
    supabase.from('ayarlar').upsert({ id: 'rutin_odemeler', veri: RUTIN_ODEMELER }).then(({ error }) => {
      if (error) setHataMesaji('Rutin ödemeler kaydedilemedi: ' + error.message);
    });
  }, [RUTIN_ODEMELER]);

  useEffect(() => {
    if (!ayarlarYuklendi.current) return;
    depoKaydet('skk_rapor_pin', RAPOR_PIN);
    supabase.from('ayarlar').upsert({ id: 'rapor_pin', veri: RAPOR_PIN }).then(({ error }) => {
      if (error) setHataMesaji('Rapor şifresi kaydedilemedi: ' + error.message);
    });
  }, [RAPOR_PIN]);

  useEffect(() => {
    if (!ayarlarYuklendi.current) return;
    depoKaydet('skk_gelir_kategorileri', GELIR_KATEGORILERI);
    supabase.from('ayarlar').upsert({ id: 'gelir_kategorileri', veri: GELIR_KATEGORILERI }).then(({ error }) => {
      if (error) setHataMesaji('Gelir kategorileri kaydedilemedi: ' + error.message);
    });
  }, [GELIR_KATEGORILERI]);

  useEffect(() => {
    if (!ayarlarYuklendi.current) return;
    depoKaydet('skk_gider_kategorileri', GIDER_KATEGORILERI);
    supabase.from('ayarlar').upsert({ id: 'gider_kategorileri', veri: GIDER_KATEGORILERI }).then(({ error }) => {
      if (error) setHataMesaji('Gider kategorileri kaydedilemedi: ' + error.message);
    });
  }, [GIDER_KATEGORILERI]);

  // Ayarlar başka bir cihazda değişirse gerçek zamanlı yansıt
  useEffect(() => {
    const kanal = supabase
      .channel('ayarlar-degisiklikleri')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ayarlar' }, (payload) => {
        const row = payload.new;
        if (!row) return;
        if (row.id === 'egitmenler') setEGITMENLER(row.veri);
        if (row.id === 'araclar') setARACLAR(row.veri);
        if (row.id === 'personel') setPERSONEL(row.veri);
        if (row.id === 'sinav_tarihleri') setSINAV_TARIHLERI(row.veri);
        if (row.id === 'devlet_harc_sabit') setDEVLET_HARC_SABIT(row.veri);
        if (row.id === 'rutin_odemeler') setRUTIN_ODEMELER(row.veri);
        if (row.id === 'rapor_pin') setRAPOR_PIN(row.veri);
        if (row.id === 'gelir_kategorileri') setGELIR_KATEGORILERI(kategorileriBirlestir(row.veri, VARSAYILAN_GELIR_KATEGORILERI));
        if (row.id === 'gider_kategorileri') setGIDER_KATEGORILERI(kategorileriBirlestir(row.veri, VARSAYILAN_GIDER_KATEGORILERI));
      })
      .subscribe();
    return () => { supabase.removeChannel(kanal); };
  }, []);

  // İlk yüklemede Supabase'den kayıtları çek
  useEffect(() => {
    const yukle = async () => {
      setYukleniyor(true);
      const { data, error } = await supabase
        .from('kayitlar')
        .select('*')
        .order('tarih', { ascending: true });

      if (error) {
        setHataMesaji('Veriler yüklenemedi: ' + error.message);
      } else {
        setKayitlar(data.map(dbdenKayit));
      }
      setYukleniyor(false);
    };
    yukle();
  }, []);

  // Gerçek zamanlı senkron: başka bir cihazdan kayıt eklenince/silinince otomatik güncelle
  useEffect(() => {
    const kanal = supabase
      .channel('kayitlar-degisiklikleri')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'kayitlar' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          setKayitlar((onceki) => {
            if (onceki.some((k) => k.id === payload.new.id)) return onceki;
            return [...onceki, dbdenKayit(payload.new)];
          });
        } else if (payload.eventType === 'DELETE') {
          setKayitlar((onceki) => onceki.filter((k) => k.id !== payload.old.id));
        } else if (payload.eventType === 'UPDATE') {
          setKayitlar((onceki) => onceki.map((k) => (k.id === payload.new.id ? dbdenKayit(payload.new) : k)));
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(kanal); };
  }, []);


  // Görünüm: 'giris' (sekreter) | 'rapor' (sahip, pin korumalı)
  const [ekran, setEkran] = useState('giris');
  const [pinModal, setPinModal] = useState(false);
  const [pinGiris, setPinGiris] = useState('');
  const [pinHata, setPinHata] = useState(false);
  const [raporAcik, setRaporAcik] = useState(false);

  const [tip, setTip] = useState('gelir');
  const [transferModal, setTransferModal] = useState(null); // {kaynak, hedef, tutar, not, tarih}
  const [form, setForm] = useState({
    tarih: bugun(), aciklama: '', kategori: '', tutar: '', harcAlinan: '', sinavTarihi: '', odendiMi: true, personel: '', egitmen: '', arac: '', odeme: 'nakit', islemYapan: 'sevgi', not: '',
  });
  const [secilenAy, setSecilenAy] = useState(ayAnahtari(bugun()));
  const [gorunum, setGorunum] = useState('ozet');
  const [secilenGun, setSecilenGun] = useState(null);
  const [secilenGiderKat, setSecilenGiderKat] = useState(null);
  const [aramaMetni, setAramaMetni] = useState('');
  const [acikSinavTarihi, setAcikSinavTarihi] = useState(null); // tıklanan sınav tarihi
  const [kiyasKategori, setKiyasKategori] = useState(''); // kategori kıyaslama seçimi
  const [listeKategoriFiltre, setListeKategoriFiltre] = useState('');
  const [listeSiralama, setListeSiralama] = useState('yeni'); // 'yeni' veya 'eski'
  const [sonKayitMesaji, setSonKayitMesaji] = useState(null);

  const ekle = async () => {
    if (!form.aciklama || !form.tutar) return;
    if (tip === 'gelir' && form.kategori === 'ozel_ders' && !form.egitmen) return;
    const tutar = parseFloat(form.tutar) || 0;
    let kalan = tutar;

    if (tip === 'gelir' && form.kategori === 'ozel_ders') {
      kalan = tutar / 2;
    }
    if (tip === 'gelir' && form.kategori === 'harc') {
      const alinanHarc = parseFloat(form.harcAlinan) || 0;
      kalan = tutar - alinanHarc;
    }

    let aciklama = form.aciklama;
    if (tip === 'gider' && form.kategori === 'personel' && form.personel) {
      const p = PERSONEL.find((x) => x.id === form.personel);
      aciklama = `${p ? p.isim : form.personel} - ${form.aciklama || 'Maaş'}`;
    }

    const yeniKayit = {
      tip,
      tarih: form.tarih,
      aciklama,
      kategori: form.kategori || (tip === 'gelir' ? 'kursiyer' : 'diger'),
      tutar,
      kalan,
      egitmen: form.egitmen,
      arac: form.arac,
      odeme: form.odeme,
      islemYapan: form.islemYapan,
      not: form.not,
      sinavTarihi: (tip === 'gelir' && form.kategori === 'harc') || (tip === 'gider' && form.kategori === 'harc_odeme') ? form.sinavTarihi : '',
      odendiMi: tip === 'gelir' && form.kategori === 'harc' ? form.odendiMi : true,
    };

    const { data, error } = await supabase
      .from('kayitlar')
      .insert(kayitToDb(yeniKayit))
      .select()
      .single();

    if (error) {
      setHataMesaji('Kayıt eklenemedi: ' + error.message);
      return;
    }

    setKayitlar([...kayitlar, dbdenKayit(data)]);

    setSonKayitMesaji(`${tip === 'gelir' ? 'Gelir' : 'Gider'} kaydedildi: ${fmt(tutar)}`);
    setTimeout(() => setSonKayitMesaji(null), 2200);

    setForm({ tarih: bugun(), aciklama: '', kategori: '', tutar: '', harcAlinan: '', sinavTarihi: '', odendiMi: true, personel: '', egitmen: '', arac: '', odeme: 'nakit', islemYapan: form.islemYapan, not: '' });
  };

  const sil = async (id) => {
    const { error } = await supabase.from('kayitlar').delete().eq('id', id);
    if (error) {
      setHataMesaji('Kayıt silinemedi: ' + error.message);
      return;
    }
    setKayitlar(kayitlar.filter((k) => k.id !== id));
  };

  const harcOdendiIsaretle = async (id) => {
    const odemeGunu = bugun();
    const { error } = await supabase.from('kayitlar').update({ odendi_mi: true, odeme_tarihi: odemeGunu }).eq('id', id);
    if (error) {
      setHataMesaji('Güncellenemedi: ' + error.message);
      return;
    }
    setKayitlar(kayitlar.map((k) => (k.id === id ? { ...k, odendiMi: true, odemeTarihi: odemeGunu } : k)));
    setSonKayitMesaji('Harç ödendi olarak işaretlendi');
    setTimeout(() => setSonKayitMesaji(null), 2200);
  };

  // Kayıt düzenleme state'i
  const [duzenleModal, setDuzenleModal] = useState(null); // düzenlenen kayıt objesi

  const transferKaydet = async () => {
    if (!transferModal || !transferModal.tutar || !transferModal.kaynak || !transferModal.hedef) return;
    if (transferModal.kaynak === transferModal.hedef) {
      setHataMesaji('Kaynak ve hedef hesap aynı olamaz');
      return;
    }
    const tutar = parseFloat(transferModal.tutar) || 0;
    if (tutar <= 0) return;

    const kaynakIsim = ODEME_TIPLERI.find(o => o.id === transferModal.kaynak)?.isim || transferModal.kaynak;
    const hedefIsim = ODEME_TIPLERI.find(o => o.id === transferModal.hedef)?.isim || transferModal.hedef;
    const aciklama = `Transfer: ${kaynakIsim} → ${hedefIsim}${transferModal.not ? ' · ' + transferModal.not : ''}`;

    // Giden kayıt (kaynak hesaptan çıkış)
    const giden = {
      tip: 'gider',
      tarih: transferModal.tarih || bugun(),
      aciklama,
      kategori: 'transfer_giden',
      tutar, kalan: tutar,
      egitmen: '', arac: '',
      odeme: transferModal.kaynak,
      islemYapan: form.islemYapan || 'ilyas',
      not: '',
      sinavTarihi: '',
      odendiMi: true,
    };
    // Gelen kayıt (hedef hesaba giriş)
    const gelen = {
      tip: 'gelir',
      tarih: transferModal.tarih || bugun(),
      aciklama,
      kategori: 'transfer_gelen',
      tutar, kalan: tutar,
      egitmen: '', arac: '',
      odeme: transferModal.hedef,
      islemYapan: form.islemYapan || 'ilyas',
      not: '',
      sinavTarihi: '',
      odendiMi: true,
    };

    const { data: gidenData, error: err1 } = await supabase.from('kayitlar').insert(kayitToDb(giden)).select().single();
    if (err1) { setHataMesaji('Transfer (giden) kaydedilemedi: ' + err1.message); return; }
    const { data: gelenData, error: err2 } = await supabase.from('kayitlar').insert(kayitToDb(gelen)).select().single();
    if (err2) { setHataMesaji('Transfer (gelen) kaydedilemedi: ' + err2.message); return; }

    setKayitlar([...kayitlar, dbdenKayit(gidenData), dbdenKayit(gelenData)]);
    setTransferModal(null);
    setSonKayitMesaji('Transfer kaydedildi: ' + fmt(tutar));
    setTimeout(() => setSonKayitMesaji(null), 2500);
  };

  const duzenleKaydet = async () => {
    if (!duzenleModal) return;
    const { error } = await supabase
      .from('kayitlar')
      .update(kayitToDb(duzenleModal))
      .eq('id', duzenleModal.id);
    if (error) {
      setHataMesaji('Düzenlenemedi: ' + error.message);
      return;
    }
    setKayitlar(kayitlar.map((k) => (k.id === duzenleModal.id ? duzenleModal : k)));
    setDuzenleModal(null);
    setSonKayitMesaji('Kayıt güncellendi');
    setTimeout(() => setSonKayitMesaji(null), 2200);
  };

  const aylar = useMemo(() => {
    const set = new Set(kayitlar.map((k) => ayAnahtari(etkinTarih(k))));
    set.add(ayAnahtari(bugun()));
    return Array.from(set).sort().reverse();
  }, [kayitlar]);

  const buAyKayitlar = kayitlar.filter((k) => ayAnahtari(etkinTarih(k)) === secilenAy);

  // Geçen ay hesaplama (kıyaslama için)
  const gecenAy = useMemo(() => {
    const [yil, ay] = secilenAy.split('-').map(Number);
    const d = new Date(yil, ay - 2, 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }, [secilenAy]);

  const gecenAyKayitlar = kayitlar.filter((k) => ayAnahtari(etkinTarih(k)) === gecenAy);

  // Net hesap: "Geçici Çekim/Avans" hiçbir şekilde kâr/zarara dahil edilmez
  // Veresiye (ödenmemiş) harç kayıtları da gelire dahil edilmez, ödenince otomatik dahil olur
  const karZararaDahil = (k) => k.kategori !== 'gecici_cekim' && k.kategori !== 'harc_odeme' && k.kategori !== 'kisisel' && k.kategori !== 'devreden_bakiye' && k.kategori !== 'transfer_gelen' && k.kategori !== 'transfer_giden' && k.odendiMi !== false;

  const gecenAyGelir = gecenAyKayitlar.filter((k) => k.tip === 'gelir' && karZararaDahil(k)).reduce((s, k) => s + k.kalan, 0);
  const gecenAyGider = gecenAyKayitlar.filter((k) => k.tip === 'gider' && karZararaDahil(k)).reduce((s, k) => s + k.kalan, 0);
  const gecenAyNet = gecenAyGelir - gecenAyGider;

  const kiyaslaYuzde = (simdi, gecen) => {
    if (gecen === 0) return null;
    return ((simdi - gecen) / Math.abs(gecen)) * 100;
  };


  const toplamGelir = buAyKayitlar.filter((k) => k.tip === 'gelir' && karZararaDahil(k)).reduce((s, k) => s + k.kalan, 0);
  const toplamGider = buAyKayitlar.filter((k) => k.tip === 'gider' && karZararaDahil(k)).reduce((s, k) => s + k.kalan, 0);
  const net = toplamGelir - toplamGider;

  const toplamHarcTahsilat = buAyKayitlar.filter((k) => k.tip === 'gelir' && k.kategori === 'harc' && k.odendiMi !== false).reduce((s, k) => s + k.tutar, 0);
  const toplamHarcKalan = buAyKayitlar.filter((k) => k.tip === 'gelir' && k.kategori === 'harc' && k.odendiMi !== false).reduce((s, k) => s + k.kalan, 0);
  const ozelDersToplam = buAyKayitlar.filter((k) => k.tip === 'gelir' && k.kategori === 'ozel_ders').reduce((s, k) => s + k.tutar, 0);
  const ozelDersKursaKalan = buAyKayitlar.filter((k) => k.tip === 'gelir' && k.kategori === 'ozel_ders').reduce((s, k) => s + k.kalan, 0);
  const kisiselCekim = buAyKayitlar.filter((k) => k.tip === 'gider' && k.kategori === 'kisisel').reduce((s, k) => s + k.kalan, 0);
  const geciciCekim = buAyKayitlar.filter((k) => k.tip === 'gider' && k.kategori === 'gecici_cekim').reduce((s, k) => s + k.kalan, 0);

  // Devlete Borç Harç: Sınav tarihi bazlı kırılım
  const devleteBorcSinavBazli = useMemo(() => {
    // Her sınav tarihi için: tahsil edilen harçların devlete giden kısmı
    // NOT: Veresiye harçlar da dahil - çünkü o kişiler de sınava girecek, devlete harçları yatırılacak
    const tahsilatMap = {};
    kayitlar.filter((k) => k.tip === 'gelir' && k.kategori === 'harc' && k.sinavTarihi).forEach((k) => {
      if (!tahsilatMap[k.sinavTarihi]) tahsilatMap[k.sinavTarihi] = { tahsilat: 0, odeme: 0 };
      tahsilatMap[k.sinavTarihi].tahsilat += (k.tutar - k.kalan);
    });
    // Sınav tarihi belirtilmemiş harçlar
    const sinavsiziTahsilat = kayitlar.filter((k) => k.tip === 'gelir' && k.kategori === 'harc' && !k.sinavTarihi).reduce((s, k) => s + (k.tutar - k.kalan), 0);

    // Her ödeme için sınav tarihini düş
    kayitlar.filter((k) => k.tip === 'gider' && k.kategori === 'harc_odeme').forEach((k) => {
      const sinav = k.sinavTarihi;
      if (sinav && tahsilatMap[sinav]) {
        tahsilatMap[sinav].odeme += k.kalan;
      } else {
        // Sınav tarihi belirtilmemiş ödemeler genel havuzdan düşülür
        if (!tahsilatMap['__genel__']) tahsilatMap['__genel__'] = { tahsilat: sinavsiziTahsilat, odeme: 0 };
        tahsilatMap['__genel__'].odeme += k.kalan;
      }
    });

    // Sınavsız tahsilat genel havuza ekle
    if (sinavsiziTahsilat > 0 && !tahsilatMap['__genel__']) {
      tahsilatMap['__genel__'] = { tahsilat: sinavsiziTahsilat, odeme: 0 };
    }

    return Object.entries(tahsilatMap).map(([etiket, v]) => ({
      etiket: etiket === '__genel__' ? 'Genel' : etiket,
      borc: v.tahsilat - v.odeme,
      odendi: v.odeme >= v.tahsilat,
    })).filter((s) => s.borc !== 0).sort((a, b) => a.etiket < b.etiket ? -1 : 1);
  }, [kayitlar]);

  // Toplam borç: sadece henüz ÖDENMEMİŞ (pozitif) bakiyeler toplanır - fazla ödenen kısımlar bu toplamı etkilemez
  const devleteBorcHarc = devleteBorcSinavBazli.filter((v) => v.borc > 0).reduce((s, v) => s + v.borc, 0);

  // Bekleyen (veresiye/ödenmemiş) harçlar listesi - tüm zamanlar, henüz ödenmemiş
  // Beklenen rutin ödemeler: bu ay o kategoriden henüz ödeme yapılmamış olanlar
  const beklenenOdemeler = useMemo(() => {
    const buGun = new Date(bugun()).getDate();
    return RUTIN_ODEMELER
      .filter((r) => r.tutar > 0)
      .map((r) => {
        const buAyOdendi = buAyKayitlar.some((k) => k.tip === 'gider' && k.kategori === r.kategori);
        const gunKaldi = r.gun - buGun;
        return { ...r, odendi: buAyOdendi, gunKaldi };
      })
      .filter((r) => !r.odendi)
      .sort((a, b) => a.gunKaldi - b.gunKaldi);
  }, [RUTIN_ODEMELER, buAyKayitlar]);

  const bekleyenHarclar = useMemo(() => {
    return kayitlar
      .filter((k) => k.tip === 'gelir' && k.kategori === 'harc' && k.odendiMi === false)
      .sort((a, b) => (a.tarih < b.tarih ? 1 : -1));
  }, [kayitlar]);

  // Sınav öncesi uyarı: 7 gün içinde sınavı olan ve hâlâ veresiye harç bekleyenler
  const sinavOncesiUyarilar = useMemo(() => {
    const bugunTarih = bugun();
    const yediGunSonra = (() => {
      const d = new Date();
      d.setDate(d.getDate() + 7);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    })();

    // Bekleyen harçları sınav tarihine göre grupla
    const gruplar = {};
    bekleyenHarclar.forEach((k) => {
      if (!k.sinavTarihi) return;
      // O sınav tarihinin gerçek tarihini SINAV_TARIHLERI listesinden bul
      const sinavObj = SINAV_TARIHLERI.find((s) => s.etiket === k.sinavTarihi);
      if (!sinavObj) return;
      if (sinavObj.tarih >= bugunTarih && sinavObj.tarih <= yediGunSonra) {
        if (!gruplar[k.sinavTarihi]) {
          gruplar[k.sinavTarihi] = { etiket: k.sinavTarihi, tarih: sinavObj.tarih, kisiSayisi: 0, toplamTutar: 0 };
        }
        gruplar[k.sinavTarihi].kisiSayisi++;
        gruplar[k.sinavTarihi].toplamTutar += k.tutar;
      }
    });
    return Object.values(gruplar).sort((a, b) => a.tarih < b.tarih ? -1 : 1);
  }, [bekleyenHarclar, SINAV_TARIHLERI]);

  // Sınav tarihi bazlı harç sayacı (bu ay, sadece ödenmiş)
  const sinavTarihiSayaci = useMemo(() => {
    const map = {};
    // Tüm zamanlar — ödendi ve veresiye dahil hepsi sayılır (sınava girecek kişi sayısı)
    kayitlar.filter((k) => k.tip === 'gelir' && k.kategori === 'harc' && k.sinavTarihi).forEach((k) => {
      if (!map[k.sinavTarihi]) map[k.sinavTarihi] = { toplam: 0, veresiye: 0 };
      map[k.sinavTarihi].toplam++;
      if (k.odendiMi === false) map[k.sinavTarihi].veresiye++;
    });
    return Object.entries(map).sort((a, b) => b[1].toplam - a[1].toplam);
  }, [kayitlar]);

  const kasaHesapla = (kayitlarListesi) => {
    const sonuc = { nakit: 0, havale: 0, pos: 0 };
    kayitlarListesi.filter((k) => k.tip !== 'gelir' || k.odendiMi !== false).forEach((k) => {
      // Harçta: tahsil edilenin TAMAMI fiziksel olarak kasaya/cebe girer (devlete giden kısım dahil, sonra ayrıca ödenir)
      // Özel derste: sadece kursa kalan kısım kasaya girer (hocanın payı hiç senin elinden geçmez)
      // Diğer gelirlerde: tutar = kalan zaten (kategori ayrımı gerekmez)
      let tutar;
      if (k.tip === 'gelir') {
        tutar = k.kategori === 'harc' ? k.tutar : k.kalan;
      } else {
        tutar = -k.kalan;
      }
      sonuc[k.odeme] = (sonuc[k.odeme] || 0) + tutar;
    });
    return sonuc;
  };
  const kasaAy = kasaHesapla(buAyKayitlar);

  // Tüm zamanlar birikimli kasa (şu an kasada gerçekte ne var)
  const kasaTumZamanlar = useMemo(() => kasaHesapla(kayitlar), [kayitlar]);
  const kasaToplam = kasaTumZamanlar.nakit + kasaTumZamanlar.havale + kasaTumZamanlar.pos;

  // Belirli bir güne kadar (o gün dahil) birikmiş toplam kasa
  const kasaGunItibariyle = (tarih) => {
    const gecmisKayitlar = kayitlar.filter((k) => etkinTarih(k) <= tarih);
    const k = kasaHesapla(gecmisKayitlar);
    return k.nakit + k.havale + k.pos;
  };

  const gelirKategorileri = useMemo(() => {
    const map = {};
    buAyKayitlar.filter((k) => k.tip === 'gelir' && k.odendiMi !== false).forEach((k) => { map[k.kategori] = (map[k.kategori] || 0) + k.kalan; });
    return GELIR_KATEGORILERI.map((g) => ({ ...g, tutar: map[g.id] || 0 })).filter((g) => g.tutar !== 0);
  }, [buAyKayitlar]);

  const giderKategorileri = useMemo(() => {
    const map = {};
    buAyKayitlar.filter((k) => k.tip === 'gider').forEach((k) => { map[k.kategori] = (map[k.kategori] || 0) + k.kalan; });
    return GIDER_KATEGORILERI.map((g) => ({ ...g, tutar: map[g.id] || 0 })).filter((g) => g.tutar !== 0).sort((a, b) => b.tutar - a.tutar);
  }, [buAyKayitlar]);
  const maxGiderKat = giderKategorileri.length ? Math.max(...giderKategorileri.map(g => g.tutar)) : 1;
  const maxGelirKat = gelirKategorileri.length ? Math.max(...gelirKategorileri.map((g) => g.tutar)) : 1;

  // Kategori kıyaslama: seçili kategorinin son 12 aydaki toplamı
  const kiyasVerisi = useMemo(() => {
    if (!kiyasKategori) return [];
    const [tipK, katK] = kiyasKategori.split(':');
    const [yil, ay] = secilenAy.split('-').map(Number);
    const sonuc = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(yil, ay - 1 - i, 1);
      const anahtar = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const ayKayitlar = kayitlar.filter((k) => ayAnahtari(etkinTarih(k)) === anahtar && k.tip === tipK && k.kategori === katK && k.odendiMi !== false);
      const toplam = ayKayitlar.reduce((s, k) => s + k.kalan, 0);
      sonuc.push({ anahtar, ayAdi: ayAdi(anahtar + '-01'), toplam, kayitSayisi: ayKayitlar.length });
    }
    return sonuc;
  }, [kiyasKategori, kayitlar, secilenAy]);
  const kiyasMax = kiyasVerisi.length ? Math.max(...kiyasVerisi.map((k) => k.toplam), 1) : 1;
  const kiyasOrt = kiyasVerisi.filter((k) => k.toplam > 0).length ? kiyasVerisi.filter((k) => k.toplam > 0).reduce((s, k) => s + k.toplam, 0) / kiyasVerisi.filter((k) => k.toplam > 0).length : 0;

  const egitmenKirilimi = useMemo(() => {
    return EGITMENLER.map((e) => {
      const kayitlarE = buAyKayitlar.filter((k) => k.egitmen === e.id);
      const gelir = kayitlarE.filter((k) => k.tip === 'gelir' && k.odendiMi !== false).reduce((s, k) => s + k.kalan, 0);
      const ozelDers = kayitlarE.filter((k) => k.tip === 'gelir' && k.kategori === 'ozel_ders').reduce((s, k) => s + k.kalan, 0);
      return { ...e, gelir, ozelDers };
    });
  }, [buAyKayitlar]);

  const aracKirilimi = useMemo(() => {
    return ARACLAR.map((a) => {
      const kayitlarA = buAyKayitlar.filter((k) => k.arac === a.id);
      const giderKayitlari = kayitlarA.filter((k) => k.tip === 'gider' && karZararaDahil(k));
      const gider = giderKayitlari.reduce((s, k) => s + k.kalan, 0);
      const giderMap = {};
      giderKayitlari.forEach((k) => { giderMap[k.kategori] = (giderMap[k.kategori] || 0) + k.kalan; });
      const giderDetay = GIDER_KATEGORILERI.map((g) => ({ ...g, tutar: giderMap[g.id] || 0 })).filter((g) => g.tutar > 0).sort((a, b) => b.tutar - a.tutar);
      return { ...a, gider, giderDetay };
    });
  }, [buAyKayitlar]);


  // Tüm zamanlarda arama sonuçları
  const aramaOK = aramaMetni.trim().length >= 2;
  const aramaSonuclari = useMemo(() => {
    if (aramaMetni.trim().length < 2) return [];
    const q = aramaMetni.trim().toLowerCase();
    let sonuc = [...kayitlar].filter((k) => {
      const katIsim = katAdi(k.kategori, k.tip === 'gelir' ? GELIR_KATEGORILERI : GIDER_KATEGORILERI).toLowerCase();
      const egitmenIsim = (EGITMENLER.find((e) => e.id === k.egitmen)?.isim || '').toLowerCase();
      const aracIsim = (ARACLAR.find((a) => a.id === k.arac)?.isim || '').toLowerCase();
      return (
        (k.aciklama || '').toLowerCase().includes(q) ||
        katIsim.includes(q) ||
        (k.tarih || '').includes(q) ||
        egitmenIsim.includes(q) ||
        aracIsim.includes(q) ||
        String(k.tutar).includes(q) ||
        (k.not || '').toLowerCase().includes(q)
      );
    });
    if (listeKategoriFiltre) {
      const [filtreTip, filtreKat] = listeKategoriFiltre.split(':');
      sonuc = sonuc.filter((k) => k.tip === filtreTip && k.kategori === filtreKat);
    }
    return sonuc.sort((a, b) => listeSiralama === 'yeni' ? (a.tarih < b.tarih ? 1 : -1) : (a.tarih > b.tarih ? 1 : -1));
  }, [aramaMetni, kayitlar, EGITMENLER, ARACLAR, listeKategoriFiltre, listeSiralama]);

  // Bu ay listesi - kategori filtresi ve sıralama uygulanmış
  const buAyKayitlarFiltreli = useMemo(() => {
    let sonuc = [...buAyKayitlar];
    if (listeKategoriFiltre) {
      const [filtreTip, filtreKat] = listeKategoriFiltre.split(':');
      sonuc = sonuc.filter((k) => k.tip === filtreTip && k.kategori === filtreKat);
    }
    return sonuc.sort((a, b) => listeSiralama === 'yeni' ? (a.tarih < b.tarih ? 1 : -1) : (a.tarih > b.tarih ? 1 : -1));
  }, [buAyKayitlar, listeKategoriFiltre, listeSiralama]);

  const personelMaaslar = useMemo(() => {
    const maaslar = buAyKayitlar.filter((k) => k.tip === 'gider' && k.kategori === 'personel');
    const map = {};
    maaslar.forEach((k) => {
      const ad = k.aciklama.split(' - ')[0];
      map[ad] = (map[ad] || 0) + k.kalan;
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [buAyKayitlar]);

  const gunlukVeri = useMemo(() => {
    const gun = gunSayisi(secilenAy);
    const data = [];
    for (let i = 1; i <= gun; i++) {
      const tarih = `${secilenAy}-${String(i).padStart(2, '0')}`;
      const gKayitlar = kayitlar.filter((k) => etkinTarih(k) === tarih);
      const gelir = gKayitlar.filter((k) => k.tip === 'gelir' && k.odendiMi !== false).reduce((s, k) => s + k.kalan, 0);
      const gider = gKayitlar.filter((k) => k.tip === 'gider' && karZararaDahil(k)).reduce((s, k) => s + k.kalan, 0);
      data.push({ tarih, gun: i, gelir, gider, net: gelir - gider, kayitSayisi: gKayitlar.length });
    }
    return data;
  }, [secilenAy, kayitlar]);

  const maxAbsNet = Math.max(...gunlukVeri.map((g) => Math.abs(g.net)), 1);
  const haftaGunleri = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];
  const ayBaslangicGunu = (() => {
    const d = new Date(secilenAy + '-01');
    let g = d.getDay();
    return g === 0 ? 6 : g - 1;
  })();

  const secilenGunKayitlar = secilenGun ? kayitlar.filter((k) => etkinTarih(k) === secilenGun) : [];
  const kasaGun = secilenGun ? kasaHesapla(secilenGunKayitlar) : { nakit: 0, havale: 0, pos: 0 };
  const kasaGunGelir = secilenGun ? (() => {
    const s = { nakit: 0, havale: 0, pos: 0 };
    secilenGunKayitlar.filter(k => k.tip === 'gelir' && k.odendiMi !== false).forEach(k => {
      const tutar = k.kategori === 'harc' ? k.tutar : k.kalan;
      s[k.odeme] = (s[k.odeme] || 0) + tutar;
    });
    return s;
  })() : { nakit: 0, havale: 0, pos: 0 };
  const kasaGunGider = secilenGun ? (() => {
    const s = { nakit: 0, havale: 0, pos: 0 };
    secilenGunKayitlar.filter(k => k.tip === 'gider').forEach(k => { s[k.odeme] = (s[k.odeme] || 0) + k.kalan; });
    return s;
  })() : { nakit: 0, havale: 0, pos: 0 };

  const ayDegistir = (yon) => {
    const [yil, ay] = secilenAy.split('-').map(Number);
    const yeniTarih = new Date(yil, ay - 1 + yon, 1);
    const yeniKey = `${yeniTarih.getFullYear()}-${String(yeniTarih.getMonth() + 1).padStart(2, '0')}`;
    setSecilenAy(yeniKey);
    setSecilenGun(null);
  };

  const ayiExcelOlarakIndir = () => {
    const basliklar = ['Tarih', 'Tip', 'Kategori', 'Açıklama', 'Tutar', 'Kalan (Net)', 'Eğitmen', 'Araç', 'Ödeme', 'İşlemi Yapan', 'Durum', 'Not'];
    const satirlar = buAyKayitlar.map((k) => [
      k.tarih,
      k.tip === 'gelir' ? 'Gelir' : 'Gider',
      katAdi(k.kategori, k.tip === 'gelir' ? GELIR_KATEGORILERI : GIDER_KATEGORILERI),
      k.aciklama,
      k.tutar,
      k.kalan,
      egitmenAdi(k.egitmen),
      aracAdi(k.arac),
      ODEME_TIPLERI.find((o) => o.id === k.odeme)?.isim || '',
      ISLEM_YAPAN.find((p) => p.id === k.islemYapan)?.isim || '',
      k.odendiMi === false ? 'Veresiye' : 'Ödendi',
      k.not || '',
    ]);

    const ozet = [
      [], ['ÖZET', ayAdi(secilenAy + '-01')],
      ['Net Gelir', toplamGelir], ['Gider', toplamGider], ['Net Kâr/Zarar', net],
      ['Nakit Kasa', kasaAy.nakit], ['Havale Kasa', kasaAy.havale], ['POS Kasa', kasaAy.pos],
    ];

    const hucreTemizle = (v) => {
      const s = String(v ?? '');
      if (s.includes(',') || s.includes('"') || s.includes('\n')) {
        return '"' + s.replace(/"/g, '""') + '"';
      }
      return s;
    };

    const tumSatirlar = [basliklar, ...satirlar, ...ozet];
    const csv = '\uFEFF' + tumSatirlar.map((satir) => satir.map(hucreTemizle).join(',')).join('\r\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `kasa-raporu-${secilenAy}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const ayiPdfOlarakIndir = () => {
    const pencere = window.open('', '_blank');
    if (!pencere) {
      setHataMesaji('Açılır pencere engellendi. Tarayıcı ayarlarından izin ver.');
      return;
    }

    const satirHtml = (k) => `
      <tr>
        <td>${k.tarih}</td>
        <td>${k.tip === 'gelir' ? 'Gelir' : 'Gider'}</td>
        <td>${katAdi(k.kategori, k.tip === 'gelir' ? GELIR_KATEGORILERI : GIDER_KATEGORILERI)}</td>
        <td>${k.aciklama}${k.odendiMi === false ? ' (Veresiye)' : ''}</td>
        <td>${egitmenAdi(k.egitmen) || '—'}</td>
        <td>${aracAdi(k.arac) || '—'}</td>
        <td>${ODEME_TIPLERI.find((o) => o.id === k.odeme)?.isim || ''}</td>
        <td style="text-align:right; font-weight:700; color:${k.tip === 'gelir' ? '#1a8a5e' : '#b8453a'}">${k.tip === 'gelir' ? '+' : '−'}${fmt(k.kalan)}</td>
      </tr>`;

    const kategoriSatirHtml = (g, renk) => `
      <tr>
        <td>${g.isim}</td>
        <td style="text-align:right; font-weight:700; color:${renk}">${fmt(g.tutar)}</td>
      </tr>`;

    const html = `
<!DOCTYPE html>
<html lang="tr">
<head>
<meta charset="UTF-8" />
<title>Kasa Raporu - ${ayAdi(secilenAy + '-01')}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: 'Segoe UI', Arial, sans-serif; color: #1a1a1a; padding: 32px; max-width: 900px; margin: 0 auto; }
  h1 { font-size: 22px; margin-bottom: 2px; }
  .alt-baslik { color: #666; font-size: 13px; margin-bottom: 24px; }
  .hero { display: flex; gap: 24px; padding: 20px; border-radius: 10px; background: ${net >= 0 ? '#eafaf1' : '#fdecea'}; margin-bottom: 24px; border: 1px solid ${net >= 0 ? '#bfe8d4' : '#f5c6c0'}; }
  .hero .buyuk { font-size: 28px; font-weight: 800; color: ${net >= 0 ? '#1a8a5e' : '#b8453a'}; }
  .hero .etiket { font-size: 11px; text-transform: uppercase; letter-spacing: 0.06em; color: #666; margin-bottom: 4px; }
  .kasa-grid { display: flex; gap: 12px; margin-bottom: 24px; }
  .kasa-kart { flex: 1; padding: 12px 14px; border: 1px solid #ddd; border-radius: 8px; }
  .kasa-kart .etiket { font-size: 10px; text-transform: uppercase; color: #888; margin-bottom: 4px; }
  .kasa-kart .deger { font-size: 16px; font-weight: 700; }
  h2 { font-size: 14px; text-transform: uppercase; letter-spacing: 0.05em; color: #444; margin: 28px 0 10px; border-bottom: 2px solid #eee; padding-bottom: 6px; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  th { text-align: left; padding: 8px 6px; background: #f4f4f4; font-weight: 700; border-bottom: 2px solid #ddd; }
  td { padding: 7px 6px; border-bottom: 1px solid #eee; }
  .ozet-tablo td:first-child { font-weight: 600; }
  @media print { body { padding: 12px; } }
</style>
</head>
<body>
  <h1>Sürücü Kursu Kasası — Aylık Rapor</h1>
  <div class="alt-baslik">${ayAdi(secilenAy + '-01')} · Oluşturulma: ${new Date().toLocaleDateString('tr-TR')}</div>

  <div class="hero">
    <div>
      <div class="etiket">${net >= 0 ? 'Net Kâr' : 'Net Zarar'}</div>
      <div class="buyuk">${net >= 0 ? '+' : '−'}${fmt(Math.abs(net))}</div>
    </div>
    <div>
      <div class="etiket">Net Gelir</div>
      <div class="buyuk" style="font-size:16px; color:#1a8a5e;">${fmt(toplamGelir)}</div>
    </div>
    <div>
      <div class="etiket">Gider</div>
      <div class="buyuk" style="font-size:16px; color:#b8453a;">${fmt(toplamGider)}</div>
    </div>
  </div>

  <div class="kasa-grid">
    <div class="kasa-kart"><div class="etiket">Nakit</div><div class="deger">${fmt(kasaAy.nakit)}</div></div>
    <div class="kasa-kart"><div class="etiket">Havale</div><div class="deger">${fmt(kasaAy.havale)}</div></div>
    <div class="kasa-kart"><div class="etiket">POS</div><div class="deger">${fmt(kasaAy.pos)}</div></div>
  </div>

  <h2>Gelir Dağılımı</h2>
  <table class="ozet-tablo">
    ${gelirKategorileri.map((g) => kategoriSatirHtml(g, '#1a8a5e')).join('')}
  </table>

  <h2>Gider Dağılımı</h2>
  <table class="ozet-tablo">
    ${giderKategorileri.map((g) => kategoriSatirHtml(g, '#b8453a')).join('')}
  </table>

  <h2>Tüm Hareketler (${buAyKayitlar.length} kayıt)</h2>
  <table>
    <thead>
      <tr><th>Tarih</th><th>Tip</th><th>Kategori</th><th>Açıklama</th><th>Eğitmen</th><th>Araç</th><th>Ödeme</th><th style="text-align:right">Tutar</th></tr>
    </thead>
    <tbody>
      ${[...buAyKayitlar].sort((a, b) => a.tarih < b.tarih ? -1 : 1).map(satirHtml).join('')}
    </tbody>
  </table>

  <script>
    window.onload = function() { window.print(); };
  </script>
</body>
</html>`;

    pencere.document.write(html);
    pencere.document.close();
  };

  const sinavPdfIndir = (tarih) => {
    const adaylar = kayitlar.filter((k) => k.tip === 'gelir' && k.kategori === 'harc' && k.sinavTarihi === tarih);
    const pencere = window.open('', '_blank');
    if (!pencere) return;

    const satirHtml = (k, i) => `
      <tr style="background:${i % 2 === 0 ? '#f9f9f9' : '#fff'}">
        <td>${i + 1}</td>
        <td>${k.aciklama}</td>
        <td>${k.tarih}</td>
        <td>${fmt(k.tutar)}</td>
        <td>${ODEME_TIPLERI.find(o => o.id === k.odeme)?.isim || ''}</td>
        <td style="color:${k.odendiMi === false ? '#b8453a' : '#1a8a5e'}; font-weight:700">${k.odendiMi === false ? 'Veresiye' : 'Ödendi'}</td>
      </tr>`;

    const odenenler = adaylar.filter(k => k.odendiMi !== false);
    const veresiyeler = adaylar.filter(k => k.odendiMi === false);

    const html = `
<!DOCTYPE html>
<html lang="tr">
<head>
<meta charset="UTF-8"/>
<title>${tarih} Sınav Aday Listesi</title>
<style>
  body { font-family: 'Segoe UI', Arial, sans-serif; color: #1a1a1a; padding: 32px; max-width: 800px; margin: 0 auto; }
  h1 { font-size: 20px; margin-bottom: 4px; }
  .alt { color: #666; font-size: 13px; margin-bottom: 24px; }
  .ozet { display: flex; gap: 20px; margin-bottom: 24px; }
  .ozet-kart { padding: 12px 18px; border-radius: 8px; border: 1px solid #ddd; }
  .ozet-kart .sayi { font-size: 22px; font-weight: 800; }
  .ozet-kart .etiket { font-size: 11px; color: #888; text-transform: uppercase; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  th { text-align: left; padding: 8px 6px; background: #f4f4f4; font-weight: 700; border-bottom: 2px solid #ddd; }
  td { padding: 7px 6px; border-bottom: 1px solid #eee; }
  @media print { body { padding: 12px; } }
</style>
</head>
<body>
  <h1>Altunbey Sürücü Kursu</h1>
  <h1>${tarih} — Sınav Aday Listesi</h1>
  <div class="alt">Oluşturulma: ${new Date().toLocaleDateString('tr-TR')}</div>

  <div class="ozet">
    <div class="ozet-kart">
      <div class="etiket">Toplam Aday</div>
      <div class="sayi">${adaylar.length}</div>
    </div>
    <div class="ozet-kart">
      <div class="etiket">Ödenen</div>
      <div class="sayi" style="color:#1a8a5e">${odenenler.length}</div>
    </div>
    <div class="ozet-kart">
      <div class="etiket">Veresiye</div>
      <div class="sayi" style="color:#b8453a">${veresiyeler.length}</div>
    </div>
    <div class="ozet-kart">
      <div class="etiket">Toplam Tahsilat</div>
      <div class="sayi">${fmt(odenenler.reduce((s, k) => s + k.tutar, 0))}</div>
    </div>
  </div>

  <table>
    <thead>
      <tr><th>#</th><th>Ad Soyad</th><th>Tarih</th><th>Tutar</th><th>Ödeme</th><th>Durum</th></tr>
    </thead>
    <tbody>
      ${adaylar.map((k, i) => satirHtml(k, i)).join('')}
    </tbody>
  </table>

  <script>window.onload = function() { window.print(); };</script>
</body>
</html>`;

    pencere.document.write(html);
    pencere.document.close();
  };


  const egitmenAdiGuncelle = (id, yeniIsim) => setEGITMENLER(EGITMENLER.map((e) => e.id === id ? { ...e, isim: yeniIsim } : e));
  const egitmenSil = (id) => setEGITMENLER(EGITMENLER.filter((e) => e.id !== id));
  const egitmenEkle = (isim) => {
    if (!isim.trim()) return;
    const id = isim.toLowerCase().replace(/[^a-z0-9ğüşıöç]/gi, '_') + '_' + Date.now();
    setEGITMENLER([...EGITMENLER, { id, isim: isim.trim() }]);
  };

  const aracAdiGuncelle = (id, yeniIsim) => setARACLAR(ARACLAR.map((a) => a.id === id ? { ...a, isim: yeniIsim } : a));
  const aracSil = (id) => setARACLAR(ARACLAR.filter((a) => a.id !== id));
  const aracEkle = (isim) => {
    if (!isim.trim()) return;
    const id = isim.toLowerCase().replace(/[^a-z0-9ğüşıöç]/gi, '_') + '_' + Date.now();
    setARACLAR([...ARACLAR, { id, isim: isim.trim() }]);
  };

  // ---- Kategori yönetimi ----
  const katIsimGuncelle = (tip, id, yeniIsim) => {
    const set = tip === 'gelir' ? setGELIR_KATEGORILERI : setGIDER_KATEGORILERI;
    set((liste) => liste.map((k) => k.id === id ? { ...k, isim: yeniIsim } : k));
  };
  const katGizleAc = (tip, id) => {
    const set = tip === 'gelir' ? setGELIR_KATEGORILERI : setGIDER_KATEGORILERI;
    set((liste) => liste.map((k) => k.id === id ? { ...k, gizli: !k.gizli } : k));
  };
  const katSil = (tip, id) => {
    // Sadece kullanıcının eklediği (ozel) kategoriler silinebilir; sistem/yerleşik kategoriler silinemez.
    const liste = tip === 'gelir' ? GELIR_KATEGORILERI : GIDER_KATEGORILERI;
    const kat = liste.find((k) => k.id === id);
    if (!kat || !kat.ozel) return;
    const kullanan = kayitlar.some((k) => k.kategori === id);
    if (kullanan) {
      window.alert(`"${kat.isim}" kategorisinde kayıtlı işlemler var, silinemez. Bunun yerine "gizle" ile listeden kaldırabilirsin (eski kayıtlar korunur).`);
      return;
    }
    if (!window.confirm(`"${kat.isim}" kategorisini silmek istediğinize emin misiniz?`)) return;
    const set = tip === 'gelir' ? setGELIR_KATEGORILERI : setGIDER_KATEGORILERI;
    set((l) => l.filter((k) => k.id !== id));
  };
  const katEkle = (tip, isim) => {
    if (!isim.trim()) return;
    const onek = tip === 'gelir' ? 'ozelg_' : 'ozeld_';
    const id = onek + isim.toLowerCase().replace(/[^a-z0-9ğüşıöç]/gi, '_') + '_' + Date.now();
    const set = tip === 'gelir' ? setGELIR_KATEGORILERI : setGIDER_KATEGORILERI;
    set((l) => [...l, { id, isim: isim.trim(), ozel: true, gizli: false }]);
  };

  const sinavTarihiSil = (id) => setSINAV_TARIHLERI(SINAV_TARIHLERI.filter((s) => s.id !== id));
  const sinavTarihiEkle = (etiket, tarih) => {
    if (!etiket.trim() || !tarih) return;
    const id = 'sinav_' + Date.now();
    setSINAV_TARIHLERI([...SINAV_TARIHLERI, { id, etiket: etiket.trim(), tarih }].sort((a, b) => a.tarih < b.tarih ? -1 : 1));
  };

  const [yeniEgitmenAdi, setYeniEgitmenAdi] = useState('');
  const [yeniAracAdi, setYeniAracAdi] = useState('');
  const [yeniGelirKat, setYeniGelirKat] = useState('');
  const [yeniGiderKat, setYeniGiderKat] = useState('');
  const [yeniSinavEtiket, setYeniSinavEtiket] = useState('');
  const [yeniSinavTarih, setYeniSinavTarih] = useState('');

  const egitmenAdi = (id) => EGITMENLER.find((e) => e.id === id)?.isim || '';

  // Geçmişte kalmamış (bugün veya sonrası) sınav tarihleri - forma sadece bunlar çıkar
  const aktifSinavTarihleri = useMemo(() => {
    const buAydaTarih = bugun();
    return SINAV_TARIHLERI.filter((s) => s.tarih >= buAydaTarih);
  }, [SINAV_TARIHLERI]);

  const aracAdi = (id) => ARACLAR.find((a) => a.id === id)?.isim || '';

  const pinKontrol = () => {
    if (pinGiris === RAPOR_PIN) {
      setRaporAcik(true);
      setEkran('rapor');
      setPinModal(false);
      setPinGiris('');
      setPinHata(false);
    } else {
      setPinHata(true);
      setPinGiris('');
    }
  };

  const KasaKart = ({ icon: Icon, label, deger, vurgu }) => (
    <div style={{ flex: 1, background: C.bg, borderRadius: 12, padding: '12px 14px', border: `1px solid ${C.border}` }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: C.textDim, fontSize: 10, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700 }}>
        <Icon size={12} /> {label}
      </div>
      <div style={{ fontWeight: 800, fontSize: 16, color: vurgu ? (deger >= 0 ? C.mint : C.rose) : C.text, fontFamily: "'JetBrains Mono', monospace", letterSpacing: '-0.02em' }}>
        {fmt(deger)}
      </div>
    </div>
  );

  // ====================================================================
  // YÜKLENİYOR EKRANI
  // ====================================================================
  if (yukleniyor) {
    return (
      <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.textDim, fontFamily: "'Inter', sans-serif" }}>
        {FONT_IMPORT}
        <div style={{ textAlign: 'center' }}>
          <Wallet size={32} color={C.mint} style={{ marginBottom: 12 }} />
          <div>Yükleniyor...</div>
        </div>
      </div>
    );
  }

  // ====================================================================
  // SEKRETER GİRİŞ EKRANI
  // ====================================================================
  if (ekran === 'giris') {
    return (
      <div style={{ minHeight: '100vh', background: C.bg, fontFamily: "'Inter', sans-serif", color: C.text, padding: '24px 18px', position: 'relative' }}>
        {FONT_IMPORT}
        <div style={{ maxWidth: 460, margin: '0 auto' }}>

          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
            <div>
              <div style={{ fontSize: 11, color: C.mint, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: 6 }}>
                Kasa Defteri
              </div>
              <h1 className="scka-display" style={{ fontSize: 28, fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>
                Yeni Kayıt
              </h1>
              <p style={{ color: C.textDim, fontSize: 13, margin: '4px 0 0' }}>{new Date().toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', weekday: 'long' })}</p>
            </div>
            <button
              onClick={() => setPinModal(true)}
              style={{
                width: 44, height: 44, borderRadius: 12, border: `1px solid ${C.border}`,
                background: C.panel, color: C.textDim, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}
              title="Rapor (şifreli)"
            >
              <Lock size={18} />
            </button>
          </div>

          {/* Tip seçici */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
            {['gelir', 'gider'].map((t) => (
              <button
                key={t}
                onClick={() => { setTip(t); setForm({ ...form, kategori: '', harcAlinan: '', personel: '' }); }}
                style={{
                  flex: 1, padding: '18px', borderRadius: 16, cursor: 'pointer',
                  background: tip === t ? (t === 'gelir' ? `linear-gradient(135deg, ${C.mintDeep}, #1F5C42)` : `linear-gradient(135deg, ${C.roseDeep}, #5A2B25)`) : C.panel,
                  color: tip === t ? '#FFFFFF' : C.textDim,
                  fontWeight: 700, fontSize: 15,
                  border: tip === t ? 'none' : `1px solid ${C.border}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  transition: 'all 0.15s',
                }}
              >
                {t === 'gelir' ? <TrendingUp size={18} /> : <TrendingDown size={18} />}
                {t === 'gelir' ? 'Gelir Girişi' : 'Gider Girişi'}
              </button>
            ))}
          </div>

          {/* Transfer Butonu */}
          <button
            onClick={() => setTransferModal({ kaynak: 'pos', hedef: 'havale', tutar: '', not: '', tarih: bugun() })}
            style={{
              width: '100%', padding: '14px', borderRadius: 14, cursor: 'pointer', marginBottom: 20,
              background: `linear-gradient(135deg, ${C.blue}, ${C.blueDeep})`, color: '#FFFFFF',
              border: 'none', fontWeight: 700, fontSize: 14,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              boxShadow: '0 2px 12px rgba(10, 37, 64, 0.2)',
            }}
          >
            <ArrowLeftRight size={16} /> Transfer / Kasa İçi Aktarım
          </button>

          {/* Form kartı */}
          <div className="scka-card" style={{ background: `linear-gradient(165deg, ${C.panel} 0%, ${C.panelAlt} 100%)`, borderRadius: 20, padding: '22px', border: `1px solid ${C.border}`, marginBottom: 18, boxShadow: '0 20px 60px -30px rgba(0,0,0,0.6)' }}>

            <label style={labelStyle}>Kategori</label>
            <select
              value={form.kategori}
              onChange={(e) => {
                const yeniKategori = e.target.value;
                setForm({
                  ...form,
                  kategori: yeniKategori,
                  // Harç seçilince devlete giden tutar otomatik dolsun (Ayarlar'daki sabit rakam)
                  harcAlinan: (tip === 'gelir' && yeniKategori === 'harc') ? String(DEVLET_HARC_SABIT) : form.harcAlinan,
                });
              }}
              style={{ ...inputStyle, marginBottom: 14 }}
            >
              <option value="">Kategori seç</option>
              {(tip === 'gelir' ? GELIR_KATEGORILERI : GIDER_KATEGORILERI).filter((k) => !k.gizli).map((k) => <option key={k.id} value={k.id}>{k.isim}</option>)}
            </select>

            {tip === 'gider' && form.kategori === 'personel' && (
              <>
                <label style={labelStyle}>Personel</label>
                <select value={form.personel} onChange={(e) => setForm({ ...form, personel: e.target.value })} style={{ ...inputStyle, marginBottom: 14 }}>
                  <option value="">Personel seç</option>
                  {PERSONEL.map((p) => <option key={p.id} value={p.id}>{p.isim} ({p.gorev})</option>)}
                </select>
              </>
            )}

            {tip === 'gelir' && form.kategori === 'ozel_ders' && (
              <>
                <label style={{ ...labelStyle, color: C.mint }}>Eğitmen / Araç (zorunlu)</label>
                <select
                  value={form.egitmen}
                  onChange={(e) => setForm({ ...form, egitmen: e.target.value })}
                  style={{ ...inputStyle, marginBottom: 14, border: !form.egitmen ? `1px solid ${C.gold}` : `1px solid rgba(95,240,172,0.3)` }}
                >
                  <option value="">Eğitmen seç</option>
                  {EGITMENLER.map((e) => <option key={e.id} value={e.id}>{e.isim}</option>)}
                </select>
                {!form.egitmen && (
                  <div style={{ ...hintBox, marginTop: -6, marginBottom: 14, borderColor: C.gold + '55', color: C.gold }}>
                    Özel ders gelirinin yarısı bu eğitmene gidiyor — lütfen seçin.
                  </div>
                )}
              </>
            )}

            <label style={labelStyle}>Açıklama</label>
            <input
              type="text"
              placeholder={
                tip === 'gider' && form.kategori === 'personel'
                  ? 'örn: Haziran maaşı'
                  : tip === 'gelir' ? 'örn: Ahmet Yılmaz' : 'örn: Akaryakıt, mutfak alışverişi...'
              }
              value={form.aciklama}
              onChange={(e) => setForm({ ...form, aciklama: e.target.value })}
              style={{ ...inputStyle, marginBottom: 14 }}
            />

            {!(tip === 'gelir' && form.kategori === 'ozel_ders') && (
              <>
                <label style={labelStyle}>Eğitmen (opsiyonel)</label>
                <select value={form.egitmen} onChange={(e) => setForm({ ...form, egitmen: e.target.value })} style={{ ...inputStyle, marginBottom: 14 }}>
                  <option value="">Seçilmedi</option>
                  {EGITMENLER.map((e) => <option key={e.id} value={e.id}>{e.isim}</option>)}
                </select>
              </>
            )}

            <label style={labelStyle}>Araç (opsiyonel)</label>
            <select value={form.arac} onChange={(e) => setForm({ ...form, arac: e.target.value })} style={{ ...inputStyle, marginBottom: 14 }}>
              <option value="">Seçilmedi</option>
              {ARACLAR.map((a) => <option key={a.id} value={a.id}>{a.isim}</option>)}
            </select>

            <div style={{ display: 'flex', gap: 10, marginBottom: form.kategori === 'harc' || form.kategori === 'ozel_ders' ? 6 : 14 }}>
              <div style={{ flex: 1.3 }}>
                <label style={labelStyle}>{form.kategori === 'harc' ? 'Toplam alınan harç (₺)' : 'Tutar (₺)'}</label>
                <input
                  type="number"
                  placeholder="0"
                  value={form.tutar}
                  onChange={(e) => setForm({ ...form, tutar: e.target.value })}
                  className="scka-mono"
                  style={{
                    ...inputStyle, fontSize: 22, fontWeight: 800,
                    background: `linear-gradient(135deg, rgba(95,240,172,0.06), rgba(95,240,172,0.02))`,
                    border: `1px solid ${tip === 'gelir' ? 'rgba(95,240,172,0.3)' : 'rgba(240,146,138,0.3)'}`,
                    color: tip === 'gelir' ? C.mint : C.rose,
                  }}
                />
              </div>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Tarih</label>
                <input
                  type="date"
                  value={form.tarih}
                  onChange={(e) => setForm({ ...form, tarih: e.target.value })}
                  style={inputStyle}
                />
              </div>
            </div>

            {tip === 'gelir' && form.kategori === 'harc' && (
              <div style={{ marginBottom: 14 }}>
                {form.tutar && (
                  <div style={{ ...hintBox, marginBottom: 14 }}>
                    Kursa kalan: <strong style={{ color: C.mint }}>{fmt((parseFloat(form.tutar) || 0) - (parseFloat(form.harcAlinan) || 0))}</strong>
                  </div>
                )}
                <label style={labelStyle}>Sınav Tarihi (opsiyonel)</label>
                <select
                  value={form.sinavTarihi}
                  onChange={(e) => setForm({ ...form, sinavTarihi: e.target.value })}
                  style={{ ...inputStyle, marginBottom: 14 }}
                >
                  <option value="">Seçilmedi</option>
                  {aktifSinavTarihleri.map((s) => <option key={s.id} value={s.etiket}>{s.etiket}</option>)}
                </select>
                {aktifSinavTarihleri.length === 0 && (
                  <div style={{ ...hintBox, marginTop: -6, marginBottom: 14 }}>
                    Henüz sınav tarihi tanımlanmamış. Ayarlar sekmesinden ekleyebilirsin.
                  </div>
                )}

                <label style={labelStyle}>Ödeme Durumu</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={() => setForm({ ...form, odendiMi: true })}
                    style={{
                      flex: 1, padding: '12px 4px', borderRadius: 12, cursor: 'pointer', fontSize: 13, fontWeight: 700,
                      border: form.odendiMi ? `1px solid ${C.mint}` : `1px solid ${C.border}`,
                      background: form.odendiMi ? 'rgba(95,230,168,0.12)' : C.bg,
                      color: form.odendiMi ? C.mint : C.textDim,
                    }}
                  >
                    Ödendi
                  </button>
                  <button
                    onClick={() => setForm({ ...form, odendiMi: false })}
                    style={{
                      flex: 1, padding: '12px 4px', borderRadius: 12, cursor: 'pointer', fontSize: 13, fontWeight: 700,
                      border: !form.odendiMi ? `1px solid ${C.gold}` : `1px solid ${C.border}`,
                      background: !form.odendiMi ? 'rgba(240,200,104,0.12)' : C.bg,
                      color: !form.odendiMi ? C.gold : C.textDim,
                    }}
                  >
                    Veresiye (Sonra Ödenecek)
                  </button>
                </div>
                {!form.odendiMi && (
                  <div style={{ ...hintBox, marginTop: 10, borderColor: C.gold + '55' }}>
                    Para henüz kasaya girmedi. Bu kayıt gelire dahil edilmez, "Bekleyen Harçlar" listesinde görünür. Ödendiğinde oradan işaretleyebilirsin.
                  </div>
                )}
              </div>
            )}

            {tip === 'gelir' && form.kategori === 'ozel_ders' && form.tutar && (
              <div style={{ ...hintBox, marginBottom: 14 }}>
                Kursa kalan (%50): <strong style={{ color: C.mint }}>{fmt((parseFloat(form.tutar) || 0) / 2)}</strong> · Hocaya: <strong>{fmt((parseFloat(form.tutar) || 0) / 2)}</strong>
              </div>
            )}

            {tip === 'gider' && form.kategori === 'gecici_cekim' && (
              <div style={{ ...hintBox, marginBottom: 14, borderColor: C.gold + '55' }}>
                Bu tutar kâr/zarar hesabına girmez, sadece kasadan çıkar. Sonradan ne için harcandığını ayrı kayıtlarla gir.
              </div>
            )}

            {tip === 'gelir' && form.kategori === 'devreden_bakiye' && (
              <div style={{ ...hintBox, marginBottom: 14, borderColor: C.gold + '55' }}>
                Bu kayıt sadece bir kerelik kullanılmalı — sisteme başlamadan önce kasada zaten var olan parayı eklemek için. Kâr/zarar hesabına girmez, sadece "Kasada Toplam" rakamını düzeltir.
              </div>
            )}

            {tip === 'gider' && form.kategori === 'harc_odeme' && (
              <div style={{ marginBottom: 14 }}>
                <div style={{ ...hintBox, marginBottom: 12, borderColor: C.gold + '55' }}>
                  Devlete yatırdığın harç tutarını gir — "Devlete Borç Harç" rakamından bu kadar düşülecek.
                </div>
                <label style={labelStyle}>Hangi Sınav İçin? (opsiyonel)</label>
                <select
                  value={form.sinavTarihi}
                  onChange={(e) => setForm({ ...form, sinavTarihi: e.target.value })}
                  style={{ ...inputStyle, marginBottom: 0 }}
                >
                  <option value="">Seçilmedi (genel ödeme)</option>
                  {SINAV_TARIHLERI.map((s) => <option key={s.id} value={s.etiket}>{s.etiket}</option>)}
                </select>
              </div>
            )}

            <label style={labelStyle}>Ödeme Şekli</label>
            <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
              {ODEME_TIPLERI.map((o) => {
                const Icon = o.icon;
                const aktif = form.odeme === o.id;
                return (
                  <button
                    key={o.id}
                    onClick={() => setForm({ ...form, odeme: o.id })}
                    style={{
                      flex: 1, padding: '12px 4px', borderRadius: 12, cursor: 'pointer', fontSize: 11, fontWeight: 700,
                      border: aktif ? `1px solid ${C.mint}` : `1px solid ${C.border}`,
                      background: aktif ? 'rgba(95,230,168,0.12)' : C.bg,
                      color: aktif ? C.mint : C.textDim,
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5,
                      transition: 'all 0.12s',
                    }}
                  >
                    <Icon size={16} /> {o.isim}
                  </button>
                );
              })}
            </div>

            <label style={labelStyle}>İşlemi Yapan</label>
            <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
              {ISLEM_YAPAN.map((p) => {
                const aktif = form.islemYapan === p.id;
                return (
                  <button
                    key={p.id}
                    onClick={() => setForm({ ...form, islemYapan: p.id })}
                    style={{
                      flex: 1, padding: '12px 4px', borderRadius: 12, cursor: 'pointer', fontSize: 13, fontWeight: 700,
                      border: aktif ? `1px solid ${C.mint}` : `1px solid ${C.border}`,
                      background: aktif ? 'rgba(95,230,168,0.12)' : C.bg,
                      color: aktif ? C.mint : C.textDim,
                      transition: 'all 0.12s',
                    }}
                  >
                    {p.isim}
                  </button>
                );
              })}
            </div>

            <label style={labelStyle}>Not (opsiyonel)</label>
            <input
              type="text"
              placeholder="ek bilgi..."
              value={form.not}
              onChange={(e) => setForm({ ...form, not: e.target.value })}
              style={{ ...inputStyle, marginBottom: 18 }}
            />

            <button
              onClick={ekle}
              className="scka-display"
              style={{
                width: '100%', padding: '17px', borderRadius: 14, border: 'none', cursor: 'pointer',
                background: `linear-gradient(135deg, #0A2540, #1E3A5F)`, color: '#FFFFFF', fontWeight: 700, fontSize: 16,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                boxShadow: '0 10px 32px -10px rgba(95,240,172,0.55)', letterSpacing: '0.02em',
              }}
            >
              <Plus size={20} /> Kaydet
            </button>
          </div>

          {/* Son eklenenler - basit liste, rakamlar görünür ama özet/rapor yok */}
          <div style={{ background: C.panel, borderRadius: 20, padding: '18px 22px', border: `1px solid ${C.border}` }}>
            <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 12, color: C.textDim, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              Bugünkü Kayıtlar
            </div>
            {kayitlar.filter(k => k.tarih === bugun()).length === 0 && (
              <div style={{ color: C.textFaint, fontSize: 13, padding: '8px 0' }}>Bugün henüz kayıt yok.</div>
            )}
            {[...kayitlar.filter(k => k.tarih === bugun())].reverse().map((k) => (
              <div key={k.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '11px 0', borderBottom: `1px solid ${C.border}` }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{k.aciklama}</div>
                  <div style={{ fontSize: 11, color: C.textFaint }}>
                    {katAdi(k.kategori, k.tip === 'gelir' ? GELIR_KATEGORILERI : GIDER_KATEGORILERI)} · {ODEME_TIPLERI.find(o=>o.id===k.odeme)?.isim}
                  </div>
                </div>
                <div style={{ fontWeight: 800, fontSize: 14, color: k.tip === 'gelir' ? C.mint : C.rose, fontFamily: "'JetBrains Mono', monospace", marginLeft: 10 }}>
                  {k.tip === 'gelir' ? '+' : '−'}{fmt(k.tutar)}
                </div>
                <button onClick={() => { if (window.confirm('Bu kaydı silmek istediğinizden emin misiniz?')) sil(k.id); }} style={{ background: 'none', border: 'none', color: C.textFaint, cursor: 'pointer', marginLeft: 8, padding: 4 }}>
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Sekreter için Harçlar bölümü */}
        {(sinavTarihiSayaci.length > 0 || bekleyenHarclar.length > 0) && (
          <div style={{ maxWidth: 520, margin: '14px auto 0' }}>
            {sinavTarihiSayaci.length > 0 && (
              <div style={{ background: C.panel, borderRadius: 18, padding: '18px 20px', marginBottom: 14, border: `1px solid ${C.border}` }}>
                <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 12, color: C.textDim, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Sınav Tarihine Göre Harç Yatıran</div>
                {sinavTarihiSayaci.map(([tarih, v]) => (
                  <div key={tarih} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: `1px solid ${C.border}` }}>
                    <span style={{ fontSize: 13, color: C.text, fontWeight: 600 }}>{tarih}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {v.veresiye > 0 && (
                        <span style={{ fontSize: 11, color: C.gold, fontWeight: 700, background: 'rgba(240,200,104,0.12)', padding: '2px 8px', borderRadius: 8 }}>{v.veresiye} veresiye</span>
                      )}
                      <span style={{ fontWeight: 800, fontSize: 14, color: C.mint, fontFamily: "'JetBrains Mono', monospace" }}>{v.toplam} kişi</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {bekleyenHarclar.length > 0 && (
              <div style={{ background: 'rgba(240,200,104,0.06)', borderRadius: 18, padding: '18px 20px', marginBottom: 14, border: '1px solid rgba(240,200,104,0.3)' }}>
                <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 4, color: C.gold, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                  Bekleyen Harçlar ({bekleyenHarclar.length})
                </div>
                <div style={{ fontSize: 11, color: C.textFaint, marginBottom: 12 }}>Henüz ödenmedi · Ödeme gelince "Ödendi"ye bas</div>
                {bekleyenHarclar.map((k) => (
                  <div key={k.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid rgba(240,200,104,0.15)' }}>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{k.aciklama}</div>
                      <div style={{ fontSize: 11, color: C.textFaint }}>
                        {k.tarih}{k.sinavTarihi ? ` · Sınav: ${k.sinavTarihi}` : ''} · {fmt(k.tutar)}
                      </div>
                    </div>
                    <button
                      onClick={() => harcOdendiIsaretle(k.id)}
                      style={{ padding: '8px 12px', borderRadius: 10, border: `1px solid ${C.mint}`, background: 'rgba(95,230,168,0.12)', color: C.mint, cursor: 'pointer', fontSize: 12, fontWeight: 700, marginLeft: 10, flexShrink: 0 }}
                    >
                      Ödendi
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Sekreter için Uyarılar - EN ALTTA */}
        {(sinavOncesiUyarilar.length > 0 || beklenenOdemeler.length > 0) && (
          <div style={{ maxWidth: 520, margin: '14px auto 0' }}>
            {sinavOncesiUyarilar.length > 0 && (
              <div style={{ background: 'rgba(220,38,38,0.06)', borderRadius: 18, padding: '18px 20px', marginBottom: 14, border: '1px solid rgba(220,38,38,0.3)' }}>
                <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 8, color: C.rose, textTransform: 'uppercase', letterSpacing: '0.1em' }}>⚠ Sınav Yaklaşıyor — Bekleyen Harçlar</div>
                {sinavOncesiUyarilar.map((u) => {
                  const kalanGun = Math.ceil((new Date(u.tarih) - new Date(bugun())) / (1000 * 60 * 60 * 24));
                  return (
                    <div key={u.etiket} style={{ fontSize: 13, color: C.text, marginBottom: 4 }}>
                      <strong>{u.etiket}</strong> — {u.kisiSayisi} kişi ödeme yapmadı
                      <span style={{ color: C.rose, marginLeft: 8, fontSize: 11 }}>({kalanGun} gün kaldı)</span>
                    </div>
                  );
                })}
              </div>
            )}

            {beklenenOdemeler.length > 0 && (
              <div style={{ background: 'rgba(217,119,6,0.06)', borderRadius: 18, padding: '18px 20px', marginBottom: 14, border: '1px solid rgba(217,119,6,0.3)' }}>
                <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 4, color: C.gold, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                  📅 Beklenen Ödemeler ({beklenenOdemeler.length})
                </div>
                <div style={{ fontSize: 11, color: C.textFaint, marginBottom: 10 }}>Bu ay henüz yapılmamış rutin ödemeler</div>
                {beklenenOdemeler.map((r) => (
                  <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0' }}>
                    <div>
                      <span style={{ fontSize: 13, fontWeight: 600 }}>{r.isim}</span>
                      <span style={{ fontSize: 11, color: r.gunKaldi < 0 ? C.rose : C.textFaint, marginLeft: 8, fontWeight: 700 }}>
                        {r.gunKaldi < 0 ? `${Math.abs(r.gunKaldi)} gün gecikti!` : r.gunKaldi === 0 ? 'Bugün!' : `${r.gunKaldi} gün kaldı`}
                      </span>
                    </div>
                    <span style={{ fontWeight: 800, fontSize: 13, color: C.gold, fontFamily: "'JetBrains Mono', monospace" }}>{fmt(r.tutar)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Toast */}
        {sonKayitMesaji && (
          <div style={{
            position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
            background: C.mint, color: '#062017', padding: '12px 24px', borderRadius: 100,
            fontWeight: 700, fontSize: 13, boxShadow: '0 8px 30px -8px rgba(95,230,168,0.6)',
            display: 'flex', alignItems: 'center', gap: 8, zIndex: 100,
          }}>
            ✓ {sonKayitMesaji}
          </div>
        )}

        {/* Hata toast */}
        {hataMesaji && (
          <div
            onClick={() => setHataMesaji(null)}
            style={{
              position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
              background: C.rose, color: '#2A1815', padding: '12px 24px', borderRadius: 100,
              fontWeight: 700, fontSize: 13, boxShadow: '0 8px 30px -8px rgba(240,146,138,0.6)',
              display: 'flex', alignItems: 'center', gap: 8, zIndex: 100, cursor: 'pointer', maxWidth: '90%',
            }}
          >
            ⚠ {hataMesaji}
          </div>
        )}


        {/* PIN modal */}
        {pinModal && (
          <div style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex',
            alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: 20,
          }}>
            <div style={{ background: C.panel, borderRadius: 20, padding: 28, width: '100%', maxWidth: 320, border: `1px solid ${C.borderLight}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: C.mint }}>
                  <Lock size={18} />
                  <span style={{ fontWeight: 800, fontSize: 15 }}>Rapor Erişimi</span>
                </div>
                <button onClick={() => { setPinModal(false); setPinGiris(''); setPinHata(false); }} style={{ background: 'none', border: 'none', color: C.textDim, cursor: 'pointer' }}>
                  <X size={20} />
                </button>
              </div>
              <p style={{ color: C.textDim, fontSize: 13, marginTop: 0, marginBottom: 16 }}>
                Finansal raporları görmek için PIN girin.
              </p>
              <input
                type="password"
                inputMode="numeric"
                placeholder="• • • •"
                value={pinGiris}
                onChange={(e) => { setPinGiris(e.target.value); setPinHata(false); }}
                onKeyDown={(e) => e.key === 'Enter' && pinKontrol()}
                autoFocus
                style={{
                  ...inputStyle, textAlign: 'center', fontSize: 24, letterSpacing: '0.4em', fontWeight: 800,
                  marginBottom: pinHata ? 8 : 16, border: pinHata ? `1px solid ${C.rose}` : `1px solid ${C.border}`,
                }}
              />
              {pinHata && <div style={{ color: C.rose, fontSize: 12, marginBottom: 12, fontWeight: 600 }}>Yanlış PIN, tekrar deneyin.</div>}
              <button
                onClick={pinKontrol}
                style={{
                  width: '100%', padding: '14px', borderRadius: 12, border: 'none', cursor: 'pointer',
                  background: `linear-gradient(135deg, #0A2540, #1E3A5F)`, color: '#FFFFFF', fontWeight: 700, fontSize: 14,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                }}
              >
                Aç <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* Transfer Modalı (sekreter ekranında da) */}
        {transferModal && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 200 }}>
            <div style={{ background: C.panel, borderRadius: '20px 20px 0 0', padding: '24px 20px', width: '100%', maxWidth: 520, border: `1px solid ${C.borderLight}`, maxHeight: '85vh', overflowY: 'auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
                <span style={{ fontWeight: 700, fontSize: 16, color: C.text }}>💸 Kasa İçi Transfer</span>
                <button onClick={() => setTransferModal(null)} style={{ background: 'none', border: 'none', color: C.textDim, cursor: 'pointer' }}><X size={22} /></button>
              </div>
              <div style={{ background: 'rgba(59,130,246,0.06)', padding: '12px 14px', borderRadius: 12, marginBottom: 16, fontSize: 12, color: C.textDim, border: '1px solid rgba(59,130,246,0.2)' }}>
                Bu işlem kâr/zarar hesabına girmez. Sadece iki hesap arasında para taşınır (POS→Havale, Nakit→Havale gibi).
              </div>

              <label style={labelStyle}>Tarih</label>
              <input type="date" value={transferModal.tarih} onChange={(e) => setTransferModal({ ...transferModal, tarih: e.target.value })} style={{ ...inputStyle, marginBottom: 14 }} />

              <label style={labelStyle}>Kaynak Hesap (nereden çıkacak)</label>
              <select value={transferModal.kaynak} onChange={(e) => setTransferModal({ ...transferModal, kaynak: e.target.value })} style={{ ...inputStyle, marginBottom: 14 }}>
                {ODEME_TIPLERI.map((o) => <option key={o.id} value={o.id}>{o.isim}</option>)}
              </select>

              <label style={labelStyle}>Hedef Hesap (nereye girecek)</label>
              <select value={transferModal.hedef} onChange={(e) => setTransferModal({ ...transferModal, hedef: e.target.value })} style={{ ...inputStyle, marginBottom: 14 }}>
                {ODEME_TIPLERI.map((o) => <option key={o.id} value={o.id}>{o.isim}</option>)}
              </select>

              <label style={labelStyle}>Tutar (₺)</label>
              <input type="number" value={transferModal.tutar} placeholder="0" onChange={(e) => setTransferModal({ ...transferModal, tutar: e.target.value })} style={{ ...inputStyle, marginBottom: 14 }} />

              <label style={labelStyle}>Not (opsiyonel)</label>
              <input type="text" value={transferModal.not} placeholder="örn: POS gelirini bankaya çektim" onChange={(e) => setTransferModal({ ...transferModal, not: e.target.value })} style={{ ...inputStyle, marginBottom: 20 }} />

              <button onClick={transferKaydet} style={{ width: '100%', padding: '14px', borderRadius: 12, border: 'none', cursor: 'pointer', background: `linear-gradient(135deg, ${C.blue}, ${C.blueDeep})`, color: '#FFFFFF', fontWeight: 700, fontSize: 15 }}>
                Transferi Kaydet
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ====================================================================
  // SAHİP RAPOR EKRANI (PIN korumalı)
  // ====================================================================
  return (
    <div style={{ minHeight: '100vh', background: C.bg, fontFamily: "'Inter', sans-serif", color: C.text, padding: '20px 16px' }}>
      {FONT_IMPORT}
      <div style={{ maxWidth: 520, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18 }}>
          <div>
            <div style={{ fontSize: 11, color: C.mint, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: 6 }}>
              Finans Raporu
            </div>
            <h1 className="scka-display" style={{ fontSize: 26, fontWeight: 800, margin: 0, letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Wallet size={22} color={C.mint} /> Sürücü Kursu Kasası
            </h1>
          </div>
          <button
            onClick={() => { setEkran('giris'); setRaporAcik(false); }}
            style={{
              padding: '10px 14px', borderRadius: 12, border: `1px solid ${C.border}`,
              background: C.panel, color: C.textDim, cursor: 'pointer', fontSize: 12, fontWeight: 700,
              display: 'flex', alignItems: 'center', gap: 6,
            }}
          >
            <Unlock size={14} /> Girişe dön
          </button>
        </div>

        {/* Ay seçici */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
          <button onClick={() => ayDegistir(-1)} style={navBtn(C)}><ChevronLeft size={18} /></button>
          <div style={{ flex: 1, textAlign: 'center', fontWeight: 700, fontSize: 14, padding: '11px 0', background: C.panel, borderRadius: 12, border: `1px solid ${C.border}` }}>
            {ayAdi(secilenAy + '-01')}
          </div>
          <button onClick={() => ayDegistir(1)} style={navBtn(C)}><ChevronRight size={18} /></button>
        </div>

        {/* Sekmeler */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
          {[
            { k: 'ozet', l: 'Aylık Özet' },
            { k: 'gunluk', l: 'Günlük Özet' },
            { k: 'egitmen', l: 'Eğitmen/Araç' },
            { k: 'ayarlar', l: 'Ayarlar' },
          ].map((v) => (
            <button
              key={v.k}
              onClick={() => setGorunum(v.k)}
              style={{
                flex: '1 1 22%', padding: '10px 4px', borderRadius: 10, cursor: 'pointer',
                background: gorunum === v.k ? C.blue : C.panel,
                color: gorunum === v.k ? '#FFFFFF' : C.textDim,
                fontWeight: 700, fontSize: 12, border: gorunum === v.k ? 'none' : `1px solid ${C.border}`,
                transition: 'all 0.12s',
                boxShadow: gorunum === v.k ? '0 2px 8px rgba(10, 37, 64, 0.2)' : 'none',
              }}
            >
              {v.l}
            </button>
          ))}
        </div>

        {gorunum === 'ozet' && (
          <>
            <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
              <button
                onClick={ayiExcelOlarakIndir}
                style={{
                  flex: 1, padding: '12px 8px', borderRadius: 12, cursor: 'pointer',
                  background: C.panel, border: `1px solid ${C.border}`, color: C.textDim,
                  fontWeight: 700, fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                }}
              >
                <Receipt size={14} /> Excel (CSV)
              </button>
              <button
                onClick={ayiPdfOlarakIndir}
                style={{
                  flex: 1, padding: '12px 8px', borderRadius: 12, cursor: 'pointer',
                  background: C.panel, border: `1px solid ${C.border}`, color: C.textDim,
                  fontWeight: 700, fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                }}
              >
                <Receipt size={14} /> PDF Rapor
              </button>
            </div>

            {/* Hero kart - Kasada Toplam büyük, Bu Ayın Net Kârı yanda küçük */}
            <div
              className="scka-card"
              style={{
                background: kasaToplam >= 0
                  ? `linear-gradient(135deg, #0A2540 0%, #1E3A5F 100%)`
                  : `linear-gradient(135deg, #7F1D1D 0%, #991B1B 100%)`,
                borderRadius: 20, padding: '24px 24px', marginBottom: 14,
                border: 'none',
                position: 'relative', overflow: 'hidden',
                boxShadow: '0 4px 20px rgba(10, 37, 64, 0.15)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.2em', fontWeight: 700 }}>
                    Kasada Toplam (Tüm Zamanlar)
                  </div>
                  <div className="scka-mono" style={{ fontSize: 40, fontWeight: 800, color: '#FFFFFF', letterSpacing: '-0.03em' }}>
                    {kasaToplam >= 0 ? '+' : '−'}{fmt(Math.abs(kasaToplam))}
                  </div>
                  {/* Kullanılabilir / Devlete Borç kırılımı */}
                  {devleteBorcHarc > 0 && (
                    <div style={{ display: 'flex', gap: 16, marginTop: 10 }}>
                      <div>
                        <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.7)', marginBottom: 2 }}>✅ Kullanılabilir</div>
                        <div className="scka-mono" style={{ fontSize: 14, fontWeight: 800, color: '#6EE7B7' }}>{fmt(kasaToplam - devleteBorcHarc)}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.7)', marginBottom: 2 }}>⚠️ Devlete Gidecek</div>
                        <div className="scka-mono" style={{ fontSize: 14, fontWeight: 800, color: '#FCD34D' }}>{fmt(devleteBorcHarc)}</div>
                      </div>
                    </div>
                  )}
                </div>
                {/* Bu ayın net kârı - yanda küçük */}
                <div style={{ background: 'rgba(255,255,255,0.12)', borderRadius: 14, padding: '12px 14px', minWidth: 120, textAlign: 'right', marginLeft: 12, backdropFilter: 'blur(10px)' }}>
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.7)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700 }}>
                    {ayAdi(secilenAy + '-01')} Kârı
                  </div>
                  <div className="scka-mono" style={{ fontSize: 16, fontWeight: 800, color: net >= 0 ? '#6EE7B7' : '#FCA5A5' }}>
                    {net >= 0 ? '+' : '−'}{fmt(Math.abs(net))}
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 24, marginTop: 18 }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#6EE7B7', fontSize: 11, marginBottom: 3, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                    <TrendingUp size={13} /> Ay Net Gelir
                  </div>
                  <div className="scka-mono" style={{ fontSize: 17, fontWeight: 800, color: '#FFFFFF' }}>{fmt(toplamGelir)}</div>
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#FCA5A5', fontSize: 11, marginBottom: 3, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                    <TrendingDown size={13} /> Ay Gider
                  </div>
                  <div className="scka-mono" style={{ fontSize: 17, fontWeight: 800, color: '#FFFFFF' }}>{fmt(toplamGider)}</div>
                </div>
              </div>
            </div>

            {/* Kasa durumu - tüm zamanlar + ay bazlı kırılım */}
            <div style={{ background: C.panel, borderRadius: 18, padding: '16px 18px', marginBottom: 14, border: `1px solid ${C.border}` }}>
              <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 12, color: C.mint, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Şu An Kasada Ne Var? (Tüm Zamanlar)</div>
              <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                <KasaKart icon={Banknote} label="Nakit (Çekmece)" deger={kasaTumZamanlar.nakit} vurgu />
                <KasaKart icon={ArrowLeftRight} label="Havale (Banka)" deger={kasaTumZamanlar.havale} vurgu />
                <KasaKart icon={CreditCard} label="POS" deger={kasaTumZamanlar.pos} vurgu />
              </div>
              <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 12, color: C.textDim, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Bu Ayın Hareketi</div>
              <div style={{ display: 'flex', gap: 8 }}>
                <KasaKart icon={Banknote} label="Nakit" deger={kasaAy.nakit} vurgu />
                <KasaKart icon={ArrowLeftRight} label="Havale" deger={kasaAy.havale} vurgu />
                <KasaKart icon={CreditCard} label="POS" deger={kasaAy.pos} vurgu />
              </div>
            </div>

            {/* Geçen Ayla Kıyaslama */}
            {gecenAyNet !== 0 && (
              <div style={{ background: C.panel, borderRadius: 18, padding: '16px 18px', marginBottom: 14, border: `1px solid ${C.border}` }}>
                <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 12, color: C.textDim, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Geçen Aya Kıyasla</div>
                {[
                  { etiket: 'Net Kâr', simdi: net, gecen: gecenAyNet },
                  { etiket: 'Gelir', simdi: toplamGelir, gecen: gecenAyGelir },
                  { etiket: 'Gider', simdi: toplamGider, gecen: gecenAyGider },
                ].map(({ etiket, simdi, gecen }) => {
                  const yuzde = kiyaslaYuzde(simdi, gecen);
                  const iyi = etiket === 'Gider' ? simdi <= gecen : simdi >= gecen;
                  return (
                    <div key={etiket} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: `1px solid ${C.border}` }}>
                      <span style={{ fontSize: 13, color: C.textDim, fontWeight: 600 }}>{etiket}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <span style={{ fontSize: 12, color: C.textFaint, fontFamily: "'JetBrains Mono', monospace" }}>{fmt(gecen)}</span>
                        <span style={{ fontSize: 13, fontWeight: 800, fontFamily: "'JetBrains Mono', monospace", color: iyi ? C.mint : C.rose }}>
                          {fmt(simdi)}
                          {yuzde !== null && (
                            <span style={{ fontSize: 11, marginLeft: 6 }}>
                              {iyi ? '↑' : '↓'}{Math.abs(yuzde).toFixed(0)}%
                            </span>
                          )}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Bilgi kutuları */}
            <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
              <div style={{ flex: 1, background: C.panel, borderRadius: 16, padding: '14px 16px', border: `1px solid ${C.border}` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: C.textDim, fontSize: 10, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700 }}>
                  <Receipt size={12} /> Harç
                </div>
                <div style={{ fontSize: 15, fontWeight: 800, color: C.text, fontFamily: "'JetBrains Mono', monospace" }}>{fmt(toplamHarcTahsilat)}</div>
                <div style={{ fontSize: 11, color: C.mint, marginTop: 3, fontWeight: 600 }}>Kursa: {fmt(toplamHarcKalan)}</div>
              </div>
              <div style={{ flex: 1, background: C.panel, borderRadius: 16, padding: '14px 16px', border: `1px solid ${C.border}` }}>
                <div style={{ color: C.textDim, fontSize: 10, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700 }}>Özel Ders</div>
                <div style={{ fontSize: 15, fontWeight: 800, color: C.text, fontFamily: "'JetBrains Mono', monospace" }}>{fmt(ozelDersToplam)}</div>
                <div style={{ fontSize: 11, color: C.mint, marginTop: 3, fontWeight: 600 }}>Kursa: {fmt(ozelDersKursaKalan)}</div>
              </div>
            </div>

            {/* Beklenen Rutin Ödemeler */}
            {beklenenOdemeler.length > 0 && (
              <div style={{ background: 'rgba(240,146,138,0.06)', borderRadius: 18, padding: '18px 20px', marginBottom: 14, border: '1px solid rgba(240,146,138,0.3)' }}>
                <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 4, color: C.rose, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                  Beklenen Ödemeler ({beklenenOdemeler.length})
                </div>
                <div style={{ fontSize: 11, color: C.textFaint, marginBottom: 10 }}>Bu ay henüz yapılmamış rutin ödemeler</div>
                {beklenenOdemeler.map((r) => (
                  <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderTop: '1px solid rgba(240,146,138,0.15)' }}>
                    <div>
                      <span style={{ fontSize: 13, fontWeight: 600 }}>{r.isim}</span>
                      <span style={{ fontSize: 11, color: r.gunKaldi < 0 ? C.rose : C.textFaint, marginLeft: 8, fontWeight: 700 }}>
                        {r.gunKaldi < 0 ? `${Math.abs(r.gunKaldi)} gün gecikti!` : r.gunKaldi === 0 ? 'Bugün!' : `${r.gunKaldi} gün kaldı`}
                      </span>
                    </div>
                    <span style={{ fontWeight: 800, fontSize: 13, color: C.rose, fontFamily: "'JetBrains Mono', monospace" }}>{fmt(r.tutar)}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Devlete Borç Harç - sınav tarihi bazlı kırılım */}
            {devleteBorcSinavBazli.length > 0 && (
              <div style={{
                background: 'rgba(240,200,104,0.06)', borderRadius: 18, padding: '18px 20px', marginBottom: 14,
                border: '1px solid rgba(240,200,104,0.3)',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <div>
                    <div style={{ color: C.gold, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Devlete Borç Harç</div>
                    <div style={{ color: C.textFaint, fontSize: 10, marginTop: 2 }}>Sınav bazlı · ödeyince "Harç Ödemesi" gideri olarak gir</div>
                  </div>
                  <div style={{ fontWeight: 800, fontSize: 17, color: devleteBorcHarc > 0 ? C.gold : C.mint, fontFamily: "'JetBrains Mono', monospace" }}>{fmt(devleteBorcHarc)}</div>
                </div>
                {devleteBorcSinavBazli.map((s) => (
                  <div key={s.etiket} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderTop: `1px solid rgba(240,200,104,0.15)` }}>
                    <span style={{ fontSize: 13, color: s.borc <= 0 ? C.textFaint : C.text, fontWeight: 600 }}>
                      {s.borc > 0 ? '⚠️' : '✅'} {s.etiket}
                    </span>
                    <span style={{ fontWeight: 800, fontSize: 13, color: s.borc > 0 ? C.gold : C.mint, fontFamily: "'JetBrains Mono', monospace" }}>
                      {s.borc > 0 ? fmt(s.borc) : (s.borc < 0 ? `Fazla ödendi (${fmt(Math.abs(s.borc))})` : 'Ödendi')}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Sınav tarihi bazlı harç sayacı */}
            {sinavTarihiSayaci.length > 0 && (
              <div style={{ background: C.panel, borderRadius: 18, padding: '18px 20px', marginBottom: 14, border: `1px solid ${C.border}` }}>
                <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 12, color: C.textDim, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Sınav Tarihine Göre Harç Yatıran Sayısı</div>
                {sinavTarihiSayaci.map(([tarih, v]) => {
                  const acik = acikSinavTarihi === tarih;
                  const adaylar = kayitlar.filter((k) => k.tip === 'gelir' && k.kategori === 'harc' && k.sinavTarihi === tarih);
                  return (
                    <div key={tarih}>
                      <div
                        onClick={() => setAcikSinavTarihi(acik ? null : tarih)}
                        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: `1px solid ${C.border}`, cursor: 'pointer' }}
                      >
                        <span style={{ fontSize: 13, color: C.text, fontWeight: 600 }}>
                          {acik ? '▼' : '▶'} {tarih}
                        </span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          {v.veresiye > 0 && (
                            <span style={{ fontSize: 11, color: C.gold, fontWeight: 700, background: 'rgba(240,200,104,0.12)', padding: '2px 8px', borderRadius: 8 }}>
                              {v.veresiye} veresiye
                            </span>
                          )}
                          <span style={{ fontWeight: 800, fontSize: 14, color: C.mint, fontFamily: "'JetBrains Mono', monospace" }}>{v.toplam} kişi</span>
                        </div>
                      </div>
                      {acik && (
                        <div style={{ background: C.bg, borderRadius: 12, padding: '14px', margin: '8px 0 4px' }}>
                          {adaylar.map((k) => (
                            <div key={k.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 0', borderBottom: `1px solid ${C.border}` }}>
                              <div>
                                <div style={{ fontSize: 13, fontWeight: 600 }}>{k.aciklama}</div>
                                <div style={{ fontSize: 11, color: C.textFaint }}>{k.tarih} · {ODEME_TIPLERI.find(o => o.id === k.odeme)?.isim}</div>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <span style={{ fontSize: 11, fontWeight: 700, color: k.odendiMi === false ? C.gold : C.mint }}>
                                  {k.odendiMi === false ? 'Veresiye' : 'Ödendi'}
                                </span>
                                <span style={{ fontWeight: 800, fontSize: 13, color: C.mint, fontFamily: "'JetBrains Mono', monospace" }}>{fmt(k.tutar)}</span>
                              </div>
                            </div>
                          ))}
                          <button
                            onClick={() => sinavPdfIndir(tarih)}
                            style={{ marginTop: 12, width: '100%', padding: '10px', borderRadius: 10, border: `1px solid ${C.border}`, background: C.panel, color: C.textDim, cursor: 'pointer', fontWeight: 700, fontSize: 13 }}
                          >
                            📄 PDF Olarak İndir
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Bekleyen (veresiye) harçlar */}
            {bekleyenHarclar.length > 0 && (
              <div style={{ background: 'rgba(240,200,104,0.06)', borderRadius: 18, padding: '18px 20px', marginBottom: 14, border: `1px solid rgba(240,200,104,0.3)` }}>
                <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 4, color: C.gold, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                  Bekleyen Harçlar ({bekleyenHarclar.length})
                </div>
                <div style={{ fontSize: 11, color: C.textFaint, marginBottom: 12 }}>Henüz ödenmedi, gelire dahil değil</div>
                {bekleyenHarclar.map((k) => (
                  <div key={k.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: `1px solid rgba(240,200,104,0.15)` }}>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{k.aciklama}</div>
                      <div style={{ fontSize: 11, color: C.textFaint }}>
                        {k.tarih}{k.sinavTarihi ? ` · Sınav: ${k.sinavTarihi}` : ''} · {fmt(k.tutar)}
                      </div>
                    </div>
                    <button
                      onClick={() => harcOdendiIsaretle(k.id)}
                      style={{
                        padding: '8px 12px', borderRadius: 10, border: `1px solid ${C.mint}`, background: 'rgba(95,230,168,0.12)',
                        color: C.mint, cursor: 'pointer', fontSize: 12, fontWeight: 700, marginLeft: 10, flexShrink: 0,
                      }}
                    >
                      Ödendi
                    </button>
                  </div>
                ))}
              </div>
            )}

            {(kisiselCekim > 0 || geciciCekim > 0) && (
              <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
                {kisiselCekim > 0 && (
                  <div style={{ flex: 1, background: C.panel, borderRadius: 16, padding: '14px 16px', border: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ color: C.textDim, fontSize: 11, fontWeight: 700 }}>Kişisel Çekim</div>
                    <div style={{ fontWeight: 800, fontSize: 14, color: C.rose, fontFamily: "'JetBrains Mono', monospace" }}>{fmt(kisiselCekim)}</div>
                  </div>
                )}
                {geciciCekim > 0 && (
                  <div style={{ flex: 1, background: C.panel, borderRadius: 16, padding: '14px 16px', border: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ color: C.textDim, fontSize: 11, fontWeight: 700 }}>Geçici Çekim</div>
                    <div style={{ fontWeight: 800, fontSize: 14, color: C.gold, fontFamily: "'JetBrains Mono', monospace" }}>{fmt(geciciCekim)}</div>
                  </div>
                )}
              </div>
            )}

            {gelirKategorileri.length > 0 && (
              <div style={{ background: C.panel, borderRadius: 18, padding: '18px 20px', marginBottom: 14, border: `1px solid ${C.border}` }}>
                <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 14, color: C.textDim, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Gelir Dağılımı</div>
                {gelirKategorileri.map((g) => {
                  const kzHaric = g.id === 'devreden_bakiye';
                  return (
                  <div key={g.id} style={{ marginBottom: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 5 }}>
                      <span style={{ color: kzHaric ? C.gold : C.text, fontWeight: 600 }}>{g.isim}{kzHaric ? ' (k/z hariç)' : ''}</span>
                      <span style={{ fontWeight: 800, fontFamily: "'JetBrains Mono', monospace" }}>{fmt(g.tutar)}</span>
                    </div>
                    <div style={{ height: 7, background: C.bg, borderRadius: 4, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${(g.tutar / maxGelirKat) * 100}%`, background: kzHaric ? `linear-gradient(90deg, #8A6E2E, ${C.gold})` : `linear-gradient(90deg, ${C.mintDeep}, ${C.mint})`, borderRadius: 4 }} />
                    </div>
                  </div>
                  );
                })}
              </div>
            )}

            {giderKategorileri.length > 0 && (
              <div style={{ background: C.panel, borderRadius: 18, padding: '18px 20px', marginBottom: 14, border: `1px solid ${C.border}` }}>
                <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 14, color: C.textDim, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Gider Dağılımı</div>
                {giderKategorileri.map((g) => {
                  const acik = secilenGiderKat === g.id;
                  const detayKayitlari = buAyKayitlar.filter((k) => k.tip === 'gider' && k.kategori === g.id);
                  const kzHaric = g.id === 'gecici_cekim' || g.id === 'harc_odeme' || g.id === 'kisisel';
                  return (
                    <div key={g.id} style={{ marginBottom: 12 }}>
                      <div
                        onClick={() => setSecilenGiderKat(acik ? null : g.id)}
                        style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 5, cursor: 'pointer' }}
                      >
                        <span style={{ color: kzHaric ? C.gold : C.text, fontWeight: 600 }}>
                          {g.isim}{kzHaric ? ' (k/z hariç)' : ''}
                        </span>
                        <span style={{ fontWeight: 800, fontFamily: "'JetBrains Mono', monospace" }}>{fmt(g.tutar)}</span>
                      </div>
                      <div
                        onClick={() => setSecilenGiderKat(acik ? null : g.id)}
                        style={{ height: 7, background: C.bg, borderRadius: 4, overflow: 'hidden', cursor: 'pointer' }}
                      >
                        <div style={{ height: '100%', width: `${(g.tutar / maxGiderKat) * 100}%`, background: kzHaric ? `linear-gradient(90deg, #8A6E2E, ${C.gold})` : `linear-gradient(90deg, ${C.roseDeep}, ${C.rose})`, borderRadius: 4 }} />
                      </div>
                      {acik && (
                        <div style={{ marginTop: 10, padding: '10px 12px', background: C.bg, borderRadius: 10, border: `1px solid ${C.border}` }}>
                          {g.id === 'yakit' && (
                            <div style={{ display: 'flex', gap: 8, marginBottom: 10, paddingBottom: 10, borderBottom: `1px solid ${C.border}` }}>
                              {ARACLAR.map((a) => {
                                const aracToplam = detayKayitlari.filter((k) => k.arac === a.id).reduce((s, k) => s + k.kalan, 0);
                                return (
                                  <div key={a.id} style={{ flex: 1, background: C.panel, borderRadius: 8, padding: '8px 10px', border: `1px solid ${C.border}` }}>
                                    <div style={{ fontSize: 10, color: C.textFaint, marginBottom: 2 }}>{a.isim}</div>
                                    <div className="scka-mono" style={{ fontWeight: 800, fontSize: 13, color: C.rose }}>{fmt(aracToplam)}</div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                          {detayKayitlari.length === 0 && <div style={{ color: C.textFaint, fontSize: 12 }}>Kayıt yok.</div>}
                          {detayKayitlari.map((k) => (
                            <div key={k.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: `1px solid ${C.border}` }}>
                              <div style={{ minWidth: 0, flex: 1 }}>
                                <div style={{ fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{k.aciklama}</div>
                                <div style={{ fontSize: 10, color: C.textFaint }}>
                                  {k.tarih}{k.egitmen ? ` · ${egitmenAdi(k.egitmen)}` : ''}{k.arac ? ` · ${aracAdi(k.arac)}` : ''}{k.not ? ` · ${k.not}` : ''}
                                </div>
                              </div>
                              <div className="scka-mono" style={{ fontWeight: 800, fontSize: 12, color: C.rose, marginLeft: 8 }}>{fmt(k.kalan)}</div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Kategori Kıyaslama - Son 12 Ay */}
            <div style={{ background: C.panel, borderRadius: 18, padding: '18px 20px', marginBottom: 14, border: `1px solid ${C.border}` }}>
              <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 4, color: C.blue, textTransform: 'uppercase', letterSpacing: '0.1em' }}>📊 Kategori Kıyaslama (Son 12 Ay)</div>
              <div style={{ fontSize: 11, color: C.textFaint, marginBottom: 12 }}>Bir kategori seç, o kalemin her ay ne kadar olduğuna bak. Örn: elektrik faturası ne kadar zamlanmış?</div>
              <select value={kiyasKategori} onChange={(e) => setKiyasKategori(e.target.value)} style={{ ...inputStyle, marginBottom: 14 }}>
                <option value="">Kategori seç...</option>
                <optgroup label="Gelir">
                  {GELIR_KATEGORILERI.filter((k) => k.id !== 'transfer_gelen' && k.id !== 'devreden_bakiye').map((k) => <option key={'g_' + k.id} value={'gelir:' + k.id}>{k.isim}</option>)}
                </optgroup>
                <optgroup label="Gider">
                  {GIDER_KATEGORILERI.filter((k) => k.id !== 'transfer_giden').map((k) => <option key={'d_' + k.id} value={'gider:' + k.id}>{k.isim}</option>)}
                </optgroup>
              </select>

              {kiyasKategori && kiyasVerisi.length > 0 && (
                <>
                  {kiyasOrt > 0 && (
                    <div style={{ background: C.bg, borderRadius: 10, padding: '10px 14px', marginBottom: 12, fontSize: 12, color: C.textDim, border: `1px solid ${C.border}` }}>
                      12 aylık ortalama: <strong style={{ color: C.text, fontFamily: "'JetBrains Mono', monospace" }}>{fmt(kiyasOrt)}</strong> · Toplam kayıt olan ay: {kiyasVerisi.filter((k) => k.toplam > 0).length}
                    </div>
                  )}
                  {kiyasVerisi.map((v) => {
                    const buAyMi = v.anahtar === secilenAy;
                    const oranli = v.toplam / kiyasMax;
                    return (
                      <div key={v.anahtar} style={{ marginBottom: 10 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                          <span style={{ color: buAyMi ? C.blue : C.text, fontWeight: buAyMi ? 800 : 600 }}>
                            {v.ayAdi}{buAyMi ? ' (bu ay)' : ''}
                            {v.kayitSayisi > 0 && <span style={{ color: C.textFaint, marginLeft: 6, fontWeight: 500 }}>· {v.kayitSayisi} kayıt</span>}
                          </span>
                          <span style={{ fontWeight: 800, fontFamily: "'JetBrains Mono', monospace", color: v.toplam === 0 ? C.textFaint : (buAyMi ? C.blue : C.text) }}>
                            {v.toplam === 0 ? '—' : fmt(v.toplam)}
                          </span>
                        </div>
                        <div style={{ height: 6, background: C.bg, borderRadius: 3, overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${oranli * 100}%`, background: buAyMi ? `linear-gradient(90deg, ${C.blue}, ${C.blueDeep})` : (v.toplam > 0 ? C.textFaint : 'transparent'), borderRadius: 3, transition: 'width 0.3s' }} />
                        </div>
                      </div>
                    );
                  })}
                </>
              )}
              {kiyasKategori && kiyasVerisi.every((v) => v.toplam === 0) && (
                <div style={{ color: C.textFaint, fontSize: 12, textAlign: 'center', padding: '10px 0' }}>Bu kategoride son 12 ayda kayıt yok.</div>
              )}
            </div>
          </>
        )}

        {gorunum === 'gunluk' && (
          <>
          {/* ---- Gelir / Gider Grafiği ---- */}
          <div style={{ background: C.panel, borderRadius: 18, padding: '18px 20px', marginBottom: 14, border: `1px solid ${C.border}` }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: C.textDim, fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                <BarChart3 size={14} /> Gelir / Gider
              </div>
              <div style={{ display: 'flex', gap: 12, fontSize: 11, fontWeight: 700 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 5, color: C.mint }}><span style={{ width: 10, height: 10, borderRadius: 3, background: C.mint }} /> Gelir</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 5, color: C.rose }}><span style={{ width: 10, height: 10, borderRadius: 3, background: C.rose }} /> Gider</span>
              </div>
            </div>

            {/* Ay toplamı: gelir vs gider yatay çubuklar */}
            <div style={{ margin: '14px 0 6px' }}>
              {(() => {
                const ayMax = Math.max(toplamGelir, toplamGider, 1);
                return (
                  <>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                      <span style={{ width: 46, fontSize: 11, fontWeight: 700, color: C.textDim }}>Gelir</span>
                      <div style={{ flex: 1, height: 22, background: C.bg, borderRadius: 7, overflow: 'hidden' }}>
                        <div style={{ width: `${(toplamGelir / ayMax) * 100}%`, height: '100%', background: `linear-gradient(90deg, ${C.mint}, ${C.mintDeep})`, borderRadius: 7 }} />
                      </div>
                      <span className="scka-mono" style={{ width: 92, textAlign: 'right', fontSize: 13, fontWeight: 800, color: C.mint }}>{fmt(toplamGelir)}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ width: 46, fontSize: 11, fontWeight: 700, color: C.textDim }}>Gider</span>
                      <div style={{ flex: 1, height: 22, background: C.bg, borderRadius: 7, overflow: 'hidden' }}>
                        <div style={{ width: `${(toplamGider / ayMax) * 100}%`, height: '100%', background: `linear-gradient(90deg, ${C.rose}, ${C.roseDeep})`, borderRadius: 7 }} />
                      </div>
                      <span className="scka-mono" style={{ width: 92, textAlign: 'right', fontSize: 13, fontWeight: 800, color: C.rose }}>{fmt(toplamGider)}</span>
                    </div>
                  </>
                );
              })()}
              <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'baseline', gap: 8, marginTop: 10, paddingTop: 8, borderTop: `1px solid ${C.border}` }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: C.textDim, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Net</span>
                <span className="scka-mono" style={{ fontSize: 16, fontWeight: 800, color: net >= 0 ? C.mint : C.rose }}>{net >= 0 ? '+' : '−'}{fmt(Math.abs(net))}</span>
              </div>
            </div>

            {/* Gün gün gelir/gider çubukları */}
            {(() => {
              const aktifGunler = gunlukVeri.filter((g) => g.gelir > 0 || g.gider > 0);
              if (aktifGunler.length === 0) {
                return <div style={{ color: C.textFaint, fontSize: 12, marginTop: 14 }}>Bu ay için henüz hareket yok.</div>;
              }
              const gunMax = Math.max(...aktifGunler.flatMap((g) => [g.gelir, g.gider]), 1);
              return (
                <div style={{ marginTop: 16 }}>
                  <div style={{ fontSize: 10, color: C.textFaint, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700, marginBottom: 8 }}>Gün Gün</div>
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, overflowX: 'auto', paddingBottom: 6, height: 132 }}>
                    {aktifGunler.map((g) => (
                      <button
                        key={g.tarih}
                        onClick={() => { setSecilenGun(g.tarih); }}
                        title={`${g.gun}. gün — Gelir ${fmt(g.gelir)} · Gider ${fmt(g.gider)}`}
                        style={{ flex: '0 0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, background: 'transparent', border: 'none', cursor: 'pointer', padding: 0 }}
                      >
                        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 104 }}>
                          <div style={{ width: 9, height: `${Math.max((g.gelir / gunMax) * 104, g.gelir > 0 ? 3 : 0)}px`, background: `linear-gradient(180deg, ${C.mint}, ${C.mintDeep})`, borderRadius: '3px 3px 0 0' }} />
                          <div style={{ width: 9, height: `${Math.max((g.gider / gunMax) * 104, g.gider > 0 ? 3 : 0)}px`, background: `linear-gradient(180deg, ${C.rose}, ${C.roseDeep})`, borderRadius: '3px 3px 0 0' }} />
                        </div>
                        <span style={{ fontSize: 9, fontWeight: 700, color: secilenGun === g.tarih ? C.blue : C.textFaint }}>{g.gun}</span>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })()}
          </div>

          {/* ---- Gün Gün Net Takvimi ---- */}
          <div style={{ background: C.panel, borderRadius: 18, padding: '18px 20px', marginBottom: 14, border: `1px solid ${C.border}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 14, color: C.textDim, fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              <Calendar size={14} /> Gün Gün Net
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 6 }}>
              {haftaGunleri.map((h) => (
                <div key={h} style={{ textAlign: 'center', fontSize: 10, color: C.textFaint, fontWeight: 700 }}>{h}</div>
              ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
              {Array.from({ length: ayBaslangicGunu }).map((_, i) => <div key={'bos' + i} />)}
              {gunlukVeri.map((g) => {
                const aktif = g.kayitSayisi > 0;
                const yogunluk = aktif ? 0.35 + 0.65 * (Math.abs(g.net) / maxAbsNet) : 1;
                const renk = g.net > 0 ? C.mintDeep : g.net < 0 ? C.roseDeep : C.bg;
                const yazi = g.net > 0 ? C.mint : g.net < 0 ? C.rose : C.textFaint;
                return (
                  <button
                    key={g.tarih}
                    onClick={() => setSecilenGun(secilenGun === g.tarih ? null : g.tarih)}
                    style={{
                      aspectRatio: '1', border: secilenGun === g.tarih ? `2px solid ${C.mint}` : `1px solid ${C.border}`,
                      borderRadius: 9, background: aktif ? renk : C.bg, opacity: aktif ? yogunluk : 0.45,
                      cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                      padding: 2, color: C.text,
                    }}
                  >
                    <div style={{ fontSize: 11, fontWeight: 700 }}>{g.gun}</div>
                    {aktif && <div style={{ fontSize: 8, color: yazi, fontWeight: 800, marginTop: 1, fontFamily: "'JetBrains Mono', monospace" }}>{g.net >= 0 ? '+' : ''}{(g.net / 1000).toFixed(1)}k</div>}
                  </button>
                );
              })}
            </div>

            {secilenGun && (
              <div style={{ marginTop: 18, paddingTop: 16, borderTop: `1px solid ${C.border}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <div style={{ fontWeight: 800, fontSize: 13, color: C.text }}>
                    {new Date(secilenGun).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', weekday: 'long' })}
                  </div>
                  {/* O gün itibariyle birikimli kasa toplamı */}
                  <div style={{ background: 'rgba(95,240,172,0.08)', border: `1px solid rgba(95,240,172,0.25)`, borderRadius: 12, padding: '8px 14px', textAlign: 'right' }}>
                    <div style={{ fontSize: 10, color: C.textFaint, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 2 }}>Bu Gün İtibariyle Kasa</div>
                    <div className="scka-mono" style={{ fontSize: 15, fontWeight: 800, color: C.mint }}>
                      {fmt(kasaGunItibariyle(secilenGun))}
                    </div>
                  </div>
                </div>

                <div style={{ fontSize: 11, color: C.textDim, marginBottom: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Gelen Ödemeler:</div>
                <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
                  {[
                    { label: 'Nakit', icon: Banknote, key: 'nakit' },
                    { label: 'Havale', icon: ArrowLeftRight, key: 'havale' },
                    { label: 'POS', icon: CreditCard, key: 'pos' },
                  ].map(({ label, icon: Icon, key }) => (
                    <div key={'gelir_' + key} style={{ flex: 1, background: 'rgba(5,150,105,0.05)', borderRadius: 14, padding: '12px 10px', border: '1px solid rgba(5,150,105,0.25)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 6 }}>
                        <Icon size={12} style={{ color: C.mint }} />
                        <span style={{ fontSize: 10, color: C.mint, fontWeight: 700, textTransform: 'uppercase' }}>{label}</span>
                      </div>
                      <div style={{ fontSize: 14, color: C.mint, fontWeight: 800, fontFamily: "'JetBrains Mono', monospace" }}>+{fmt(kasaGunGelir[key])}</div>
                    </div>
                  ))}
                </div>

                <div style={{ fontSize: 11, color: C.textDim, marginBottom: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Giden Ödemeler:</div>
                <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
                  {[
                    { label: 'Nakit', icon: Banknote, key: 'nakit' },
                    { label: 'Havale', icon: ArrowLeftRight, key: 'havale' },
                    { label: 'POS', icon: CreditCard, key: 'pos' },
                  ].map(({ label, icon: Icon, key }) => (
                    <div key={'gider_' + key} style={{ flex: 1, background: 'rgba(220,38,38,0.05)', borderRadius: 14, padding: '12px 10px', border: '1px solid rgba(220,38,38,0.25)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 6 }}>
                        <Icon size={12} style={{ color: C.rose }} />
                        <span style={{ fontSize: 10, color: C.rose, fontWeight: 700, textTransform: 'uppercase' }}>{label}</span>
                      </div>
                      <div style={{ fontSize: 14, color: C.rose, fontWeight: 800, fontFamily: "'JetBrains Mono', monospace" }}>−{fmt(kasaGunGider[key])}</div>
                    </div>
                  ))}
                </div>

                {/* Net Toplam - büyük tek kutu */}
                <div style={{ background: `linear-gradient(135deg, ${C.blue}, ${C.blueDeep})`, borderRadius: 14, padding: '16px 20px', marginBottom: 14, color: '#FFF' }}>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700 }}>Günün Net Kasa Hareketi</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: 22, fontWeight: 800, fontFamily: "'JetBrains Mono', monospace", color: (kasaGun.nakit + kasaGun.havale + kasaGun.pos) >= 0 ? '#6EE7B7' : '#FCA5A5' }}>
                        {(kasaGun.nakit + kasaGun.havale + kasaGun.pos) >= 0 ? '+' : '−'}{fmt(Math.abs(kasaGun.nakit + kasaGun.havale + kasaGun.pos))}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', fontSize: 11, color: 'rgba(255,255,255,0.8)', fontFamily: "'JetBrains Mono', monospace" }}>
                      <div>Nakit: {kasaGun.nakit >= 0 ? '+' : '−'}{fmt(Math.abs(kasaGun.nakit))}</div>
                      <div>Havale: {kasaGun.havale >= 0 ? '+' : '−'}{fmt(Math.abs(kasaGun.havale))}</div>
                      <div>POS: {kasaGun.pos >= 0 ? '+' : '−'}{fmt(Math.abs(kasaGun.pos))}</div>
                    </div>
                  </div>
                </div>

                {secilenGunKayitlar.length === 0 && <div style={{ color: C.textFaint, fontSize: 13 }}>Bu gün için kayıt yok.</div>}

                {/* Gelirler */}
                {secilenGunKayitlar.filter(k => k.tip === 'gelir').length > 0 && (
                  <>
                    <div style={{ fontSize: 11, fontWeight: 700, color: C.mint, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>Gelirler</div>
                    {secilenGunKayitlar.filter(k => k.tip === 'gelir').map((k) => (
                      <div key={k.id} style={{ padding: '9px 0', borderBottom: `1px solid ${C.border}` }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ fontSize: 13, fontWeight: 600 }}>
                            {k.aciklama}
                            {k.odendiMi === false && <span style={{ fontSize: 9, fontWeight: 800, color: C.gold, background: 'rgba(240,200,104,0.15)', padding: '2px 6px', borderRadius: 6, marginLeft: 6 }}>VERESİYE</span>}
                            {k.odemeTarihi && k.odemeTarihi !== k.tarih && (
                              <span style={{ fontSize: 9, fontWeight: 800, color: C.mint, background: 'rgba(5,150,105,0.12)', padding: '2px 6px', borderRadius: 6, marginLeft: 6 }}>
                                VERESİYE TAHSİLATI · giriş {new Date(k.tarih).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })}
                              </span>
                            )}
                          </span>
                          <span style={{ fontWeight: 800, fontSize: 13, color: k.odendiMi === false ? C.textFaint : C.mint, fontFamily: "'JetBrains Mono', monospace" }}>
                            +{fmt(k.kategori === 'harc' ? k.tutar : k.kalan)}
                          </span>
                        </div>
                        <div style={{ fontSize: 11, color: C.textFaint }}>
                          {katAdi(k.kategori, GELIR_KATEGORILERI)}{k.kategori === 'harc' ? ` · Kursa: ${fmt(k.kalan)}` : ''} · {ODEME_TIPLERI.find(o=>o.id===k.odeme)?.isim}{k.egitmen ? ` · ${egitmenAdi(k.egitmen)}` : ''}{k.arac ? ` · ${aracAdi(k.arac)}` : ''}{k.not ? ` · ${k.not}` : ''}
                        </div>
                      </div>
                    ))}
                  </>
                )}

                {/* Giderler */}
                {secilenGunKayitlar.filter(k => k.tip === 'gider').length > 0 && (
                  <>
                    <div style={{ fontSize: 11, fontWeight: 700, color: C.rose, textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: 14, marginBottom: 6 }}>Giderler</div>
                    {secilenGunKayitlar.filter(k => k.tip === 'gider').map((k) => (
                      <div key={k.id} style={{ padding: '9px 0', borderBottom: `1px solid ${C.border}` }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ fontSize: 13, fontWeight: 600 }}>{k.aciklama}</span>
                          <span style={{ fontWeight: 800, fontSize: 13, color: C.rose, fontFamily: "'JetBrains Mono', monospace" }}>−{fmt(k.kalan)}</span>
                        </div>
                        <div style={{ fontSize: 11, color: C.textFaint }}>
                          {katAdi(k.kategori, GIDER_KATEGORILERI)} · {ODEME_TIPLERI.find(o=>o.id===k.odeme)?.isim}{k.egitmen ? ` · ${egitmenAdi(k.egitmen)}` : ''}{k.arac ? ` · ${aracAdi(k.arac)}` : ''}{k.not ? ` · ${k.not}` : ''}
                        </div>
                      </div>
                    ))}
                  </>
                )}
              </div>
            )}
          </div>
          </>
        )}

        {gorunum === 'egitmen' && (
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 10, color: C.textDim, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Eğitmen Gelir Katkısı</div>
            {egitmenKirilimi.map((e) => (
              <div key={e.id} style={{ background: C.panel, borderRadius: 18, padding: '16px 18px', marginBottom: 10, border: `1px solid ${C.border}` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1px solid ${C.border}` }}>
                    <TrendingUp size={16} color={C.mint} />
                  </div>
                  <div style={{ fontWeight: 800, fontSize: 14 }}>{e.isim}</div>
                </div>
                <div style={{ display: 'flex', gap: 10, fontSize: 12, marginTop: 12 }}>
                  <div style={{ flex: 1, background: C.bg, borderRadius: 10, padding: '8px 10px', border: `1px solid ${C.border}` }}>
                    <div style={{ color: C.textFaint, fontSize: 10, marginBottom: 2 }}>Toplam Gelir Katkısı</div>
                    <div style={{ fontWeight: 800, color: C.mint, fontFamily: "'JetBrains Mono', monospace" }}>{fmt(e.gelir)}</div>
                  </div>
                  <div style={{ flex: 1, background: C.bg, borderRadius: 10, padding: '8px 10px', border: `1px solid ${C.border}` }}>
                    <div style={{ color: C.textFaint, fontSize: 10, marginBottom: 2 }}>Özel Ders (Kursa)</div>
                    <div style={{ fontWeight: 800, fontFamily: "'JetBrains Mono', monospace" }}>{fmt(e.ozelDers)}</div>
                  </div>
                </div>
              </div>
            ))}

            <div style={{ fontSize: 12, fontWeight: 700, marginTop: 18, marginBottom: 10, color: C.textDim, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Araç Gideri</div>
            {aracKirilimi.map((a) => (
              <div key={a.id} style={{ background: C.panel, borderRadius: 18, padding: '16px 18px', marginBottom: 10, border: `1px solid ${C.border}` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1px solid ${C.border}` }}>
                    <Car size={16} color={C.rose} />
                  </div>
                  <div style={{ fontWeight: 800, fontSize: 14 }}>{a.isim}</div>
                  <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
                    <div style={{ fontSize: 10, color: C.textDim, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700 }}>Toplam Gider</div>
                    <div style={{ fontWeight: 800, fontSize: 17, color: C.rose, fontFamily: "'JetBrains Mono', monospace" }}>{fmt(a.gider)}</div>
                  </div>
                </div>
                {a.giderDetay.length > 0 && (
                  <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${C.border}` }}>
                    {a.giderDetay.map((g) => (
                      <div key={g.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '4px 0' }}>
                        <span style={{ color: C.textDim }}>{g.isim}</span>
                        <span style={{ fontWeight: 700, fontFamily: "'JetBrains Mono', monospace" }}>{fmt(g.tutar)}</span>
                      </div>
                    ))}
                  </div>
                )}
                {a.giderDetay.length === 0 && (
                  <div style={{ marginTop: 10, color: C.textFaint, fontSize: 12 }}>Bu ay kayıt yok.</div>
                )}
              </div>
            ))}
          </div>
        )}

        {gorunum === 'ayarlar' && (
          <div style={{ marginBottom: 14 }}>
            <div style={{ background: C.panel, borderRadius: 18, padding: '18px 20px', marginBottom: 14, border: `1px solid ${C.border}` }}>
              <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 14, color: C.textDim, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Eğitmenler</div>
              {EGITMENLER.map((e) => (
                <div key={e.id} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 10 }}>
                  <input
                    type="text"
                    value={e.isim}
                    onChange={(ev) => egitmenAdiGuncelle(e.id, ev.target.value)}
                    style={{ ...inputStyle, flex: 1 }}
                  />
                  <button
                    onClick={() => egitmenSil(e.id)}
                    style={{ background: 'none', border: `1px solid ${C.border}`, borderRadius: 10, color: C.rose, cursor: 'pointer', padding: '10px 12px' }}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
              <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                <input
                  type="text"
                  placeholder="Yeni eğitmen adı..."
                  value={yeniEgitmenAdi}
                  onChange={(e) => setYeniEgitmenAdi(e.target.value)}
                  style={{ ...inputStyle, flex: 1 }}
                />
                <button
                  onClick={() => { egitmenEkle(yeniEgitmenAdi); setYeniEgitmenAdi(''); }}
                  style={{ background: C.mint, border: 'none', borderRadius: 10, color: '#062017', cursor: 'pointer', padding: '0 16px', fontWeight: 800 }}
                >
                  <Plus size={16} />
                </button>
              </div>
            </div>

            <div style={{ background: C.panel, borderRadius: 18, padding: '18px 20px', marginBottom: 14, border: `1px solid ${C.border}` }}>
              <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 14, color: C.textDim, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Araçlar (Plakalar)</div>
              {ARACLAR.map((a) => (
                <div key={a.id} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 10 }}>
                  <input
                    type="text"
                    value={a.isim}
                    onChange={(ev) => aracAdiGuncelle(a.id, ev.target.value)}
                    style={{ ...inputStyle, flex: 1 }}
                  />
                  <button
                    onClick={() => aracSil(a.id)}
                    style={{ background: 'none', border: `1px solid ${C.border}`, borderRadius: 10, color: C.rose, cursor: 'pointer', padding: '10px 12px' }}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
              <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                <input
                  type="text"
                  placeholder="Yeni plaka..."
                  value={yeniAracAdi}
                  onChange={(e) => setYeniAracAdi(e.target.value)}
                  style={{ ...inputStyle, flex: 1 }}
                />
                <button
                  onClick={() => { aracEkle(yeniAracAdi); setYeniAracAdi(''); }}
                  style={{ background: C.mint, border: 'none', borderRadius: 10, color: '#062017', cursor: 'pointer', padding: '0 16px', fontWeight: 800 }}
                >
                  <Plus size={16} />
                </button>
              </div>
            </div>

            <div style={{ background: C.panel, borderRadius: 18, padding: '18px 20px', marginBottom: 14, border: `1px solid ${C.border}` }}>
              <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 4, color: C.mint, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Gelir Kategorileri</div>
              <div style={{ fontSize: 11, color: C.textFaint, marginBottom: 14 }}>Adı değiştirmek için yaz. <Lock size={11} style={{ verticalAlign: 'middle' }} /> işaretli kategoriler hesap mantığına bağlıdır, silinemez ama adı değiştirilebilir. Kullanmadığın kategoriyi gizlersen girişte çıkmaz, eski kayıtların korunur.</div>
              {GELIR_KATEGORILERI.map((k) => (
                <div key={k.id} style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 10, opacity: k.gizli ? 0.5 : 1 }}>
                  <input
                    type="text"
                    value={k.isim}
                    onChange={(ev) => katIsimGuncelle('gelir', k.id, ev.target.value)}
                    style={{ ...inputStyle, flex: 1 }}
                  />
                  {k.sistem && (
                    <span title="Sistem kategorisi — silinemez, hesap mantığına bağlı" style={{ color: C.textFaint, display: 'flex', alignItems: 'center', padding: '0 2px' }}>
                      <Lock size={14} />
                    </span>
                  )}
                  <button
                    onClick={() => katGizleAc('gelir', k.id)}
                    title={k.gizli ? 'Listede göster' : 'Girişte gizle'}
                    style={{ background: 'none', border: `1px solid ${C.border}`, borderRadius: 10, color: k.gizli ? C.gold : C.textDim, cursor: 'pointer', padding: '10px 11px' }}
                  >
                    {k.gizli ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                  {k.ozel && (
                    <button
                      onClick={() => katSil('gelir', k.id)}
                      title="Sil"
                      style={{ background: 'none', border: `1px solid ${C.border}`, borderRadius: 10, color: C.rose, cursor: 'pointer', padding: '10px 11px' }}
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>
              ))}
              <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                <input
                  type="text"
                  placeholder="Yeni gelir kategorisi..."
                  value={yeniGelirKat}
                  onChange={(e) => setYeniGelirKat(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { katEkle('gelir', yeniGelirKat); setYeniGelirKat(''); } }}
                  style={{ ...inputStyle, flex: 1 }}
                />
                <button
                  onClick={() => { katEkle('gelir', yeniGelirKat); setYeniGelirKat(''); }}
                  style={{ background: C.mint, border: 'none', borderRadius: 10, color: '#062017', cursor: 'pointer', padding: '0 16px', fontWeight: 800 }}
                >
                  <Plus size={16} />
                </button>
              </div>
            </div>

            <div style={{ background: C.panel, borderRadius: 18, padding: '18px 20px', marginBottom: 14, border: `1px solid ${C.border}` }}>
              <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 4, color: C.rose, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Gider Kategorileri</div>
              <div style={{ fontSize: 11, color: C.textFaint, marginBottom: 14 }}>Adı değiştirmek için yaz. <Lock size={11} style={{ verticalAlign: 'middle' }} /> işaretli kategoriler hesap mantığına bağlıdır, silinemez ama adı değiştirilebilir. Kullanmadığın kategoriyi gizlersen girişte çıkmaz, eski kayıtların korunur.</div>
              {GIDER_KATEGORILERI.map((k) => (
                <div key={k.id} style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 10, opacity: k.gizli ? 0.5 : 1 }}>
                  <input
                    type="text"
                    value={k.isim}
                    onChange={(ev) => katIsimGuncelle('gider', k.id, ev.target.value)}
                    style={{ ...inputStyle, flex: 1 }}
                  />
                  {k.sistem && (
                    <span title="Sistem kategorisi — silinemez, hesap mantığına bağlı" style={{ color: C.textFaint, display: 'flex', alignItems: 'center', padding: '0 2px' }}>
                      <Lock size={14} />
                    </span>
                  )}
                  <button
                    onClick={() => katGizleAc('gider', k.id)}
                    title={k.gizli ? 'Listede göster' : 'Girişte gizle'}
                    style={{ background: 'none', border: `1px solid ${C.border}`, borderRadius: 10, color: k.gizli ? C.gold : C.textDim, cursor: 'pointer', padding: '10px 11px' }}
                  >
                    {k.gizli ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                  {k.ozel && (
                    <button
                      onClick={() => katSil('gider', k.id)}
                      title="Sil"
                      style={{ background: 'none', border: `1px solid ${C.border}`, borderRadius: 10, color: C.rose, cursor: 'pointer', padding: '10px 11px' }}
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>
              ))}
              <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                <input
                  type="text"
                  placeholder="Yeni gider kategorisi..."
                  value={yeniGiderKat}
                  onChange={(e) => setYeniGiderKat(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { katEkle('gider', yeniGiderKat); setYeniGiderKat(''); } }}
                  style={{ ...inputStyle, flex: 1 }}
                />
                <button
                  onClick={() => { katEkle('gider', yeniGiderKat); setYeniGiderKat(''); }}
                  style={{ background: C.mint, border: 'none', borderRadius: 10, color: '#062017', cursor: 'pointer', padding: '0 16px', fontWeight: 800 }}
                >
                  <Plus size={16} />
                </button>
              </div>
            </div>

            <div style={{ background: C.panel, borderRadius: 18, padding: '18px 20px', marginBottom: 14, border: `1px solid ${C.border}` }}>
              <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 4, color: C.textDim, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Rapor Şifresi</div>
              <div style={{ fontSize: 11, color: C.textFaint, marginBottom: 14 }}>Rapor ekranına giriş için kullanılan şifre. Değiştirdiğinde tüm cihazlarda yeni şifre geçerli olur.</div>
              <input
                type="text"
                value={RAPOR_PIN}
                onChange={(e) => setRAPOR_PIN(e.target.value)}
                style={{ ...inputStyle, letterSpacing: '0.3em', fontFamily: "'JetBrains Mono', monospace" }}
                placeholder="Yeni şifre"
              />
            </div>

            <div style={{ background: C.panel, borderRadius: 18, padding: '18px 20px', marginBottom: 14, border: `1px solid ${C.border}` }}>
              <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 4, color: C.textDim, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Devlete Giden Harç Tutarı (Sabit)</div>
              <div style={{ fontSize: 11, color: C.textFaint, marginBottom: 14 }}>Her harç girişinde bu rakam otomatik dolar. Devlet ücreti değişirse buradan güncelle.</div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input
                  type="number"
                  value={DEVLET_HARC_SABIT}
                  onChange={(e) => setDEVLET_HARC_SABIT(parseFloat(e.target.value) || 0)}
                  style={{ ...inputStyle, flex: 1 }}
                />
                <span style={{ color: C.textDim, fontSize: 14, fontWeight: 700 }}>₺</span>
              </div>
            </div>

            <div style={{ background: C.panel, borderRadius: 18, padding: '18px 20px', marginBottom: 14, border: `1px solid ${C.border}` }}>
              <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 4, color: C.textDim, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Rutin Ödemeler (Aylık Hatırlatma)</div>
              <div style={{ fontSize: 11, color: C.textFaint, marginBottom: 14 }}>Her ay yapılan sabit ödemeler. O ay ilgili kategoriden ödeme girilince hatırlatma otomatik kaybolur.</div>
              {RUTIN_ODEMELER.map((r) => (
                <div key={r.id} style={{ marginBottom: 12, padding: '10px', background: C.bg, borderRadius: 12, border: `1px solid ${C.border}` }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                    <input
                      type="text"
                      placeholder="Ödeme adı"
                      value={r.isim}
                      onChange={(e) => setRUTIN_ODEMELER(RUTIN_ODEMELER.map((x) => x.id === r.id ? { ...x, isim: e.target.value } : x))}
                      style={{ ...inputStyle, flex: 1.5 }}
                    />
                    <button
                      onClick={() => { if (window.confirm(`"${r.isim}" rutin ödemesini silmek istediğinizden emin misiniz?`)) setRUTIN_ODEMELER(RUTIN_ODEMELER.filter((x) => x.id !== r.id)); }}
                      style={{ background: 'none', border: `1px solid ${C.border}`, borderRadius: 10, color: C.rose, cursor: 'pointer', padding: '10px 12px' }}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <input
                      type="number"
                      placeholder="Tutar (₺)"
                      value={r.tutar || ''}
                      onChange={(e) => setRUTIN_ODEMELER(RUTIN_ODEMELER.map((x) => x.id === r.id ? { ...x, tutar: parseFloat(e.target.value) || 0 } : x))}
                      style={{ ...inputStyle, flex: 1 }}
                    />
                    <input
                      type="number"
                      placeholder="Gün"
                      min="1"
                      max="31"
                      value={r.gun || ''}
                      onChange={(e) => setRUTIN_ODEMELER(RUTIN_ODEMELER.map((x) => x.id === r.id ? { ...x, gun: parseInt(e.target.value) || 1 } : x))}
                      style={{ ...inputStyle, flex: 0.6 }}
                    />
                    <select
                      value={r.kategori}
                      onChange={(e) => setRUTIN_ODEMELER(RUTIN_ODEMELER.map((x) => x.id === r.id ? { ...x, kategori: e.target.value } : x))}
                      style={{ ...inputStyle, flex: 1.2 }}
                    >
                      {GIDER_KATEGORILERI.map((k) => <option key={k.id} value={k.id}>{k.isim}</option>)}
                    </select>
                  </div>
                </div>
              ))}
              <button
                onClick={() => setRUTIN_ODEMELER([...RUTIN_ODEMELER, { id: 'rutin_' + Date.now(), isim: '', tutar: 0, gun: 1, kategori: 'diger' }])}
                style={{ width: '100%', padding: '10px', borderRadius: 10, border: `1px dashed ${C.border}`, background: 'none', color: C.mint, cursor: 'pointer', fontWeight: 700, fontSize: 13 }}
              >
                <Plus size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} /> Yeni Rutin Ödeme Ekle
              </button>
              <div style={{ ...hintBox, fontSize: 11, marginTop: 10 }}>
                "Gün" = ayın kaçında ödenmesi gerekiyor. "Kategori" = ödemeyi girerken hangi kategoriyi seçiyorsan onu seç (eşleşme buna göre yapılır).
              </div>
            </div>

            <div style={{ background: C.panel, borderRadius: 18, padding: '18px 20px', marginBottom: 14, border: `1px solid ${C.border}` }}>
              <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 4, color: C.textDim, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Sınav Tarihleri</div>
              <div style={{ fontSize: 11, color: C.textFaint, marginBottom: 14 }}>Geçmiş tarihler otomatik gizlenir, formda görünmez.</div>
              {SINAV_TARIHLERI.length === 0 && (
                <div style={{ color: C.textFaint, fontSize: 13, marginBottom: 10 }}>Henüz sınav tarihi eklenmedi.</div>
              )}
              {SINAV_TARIHLERI.map((s) => {
                const gecmis = s.tarih < bugun();
                return (
                  <div key={s.id} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 10, opacity: gecmis ? 0.45 : 1 }}>
                    <div style={{ flex: 1, ...inputStyle, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span>{s.etiket}</span>
                      <span style={{ fontSize: 11, color: gecmis ? C.textFaint : C.mint, fontWeight: 700 }}>
                        {gecmis ? 'Geçmiş' : s.tarih}
                      </span>
                    </div>
                    <button
                      onClick={() => sinavTarihiSil(s.id)}
                      style={{ background: 'none', border: `1px solid ${C.border}`, borderRadius: 10, color: C.rose, cursor: 'pointer', padding: '10px 12px' }}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                );
              })}
              <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                <input
                  type="text"
                  placeholder="Etiket (örn: 27-28 Ağustos)"
                  value={yeniSinavEtiket}
                  onChange={(e) => setYeniSinavEtiket(e.target.value)}
                  style={{ ...inputStyle, flex: 1.4 }}
                />
                <input
                  type="date"
                  value={yeniSinavTarih}
                  onChange={(e) => setYeniSinavTarih(e.target.value)}
                  style={{ ...inputStyle, flex: 1 }}
                />
                <button
                  onClick={() => {
                    sinavTarihiEkle(yeniSinavEtiket, yeniSinavTarih);
                    setYeniSinavEtiket('');
                    setYeniSinavTarih('');
                  }}
                  style={{ background: C.mint, border: 'none', borderRadius: 10, color: '#062017', cursor: 'pointer', padding: '0 16px', fontWeight: 800 }}
                >
                  <Plus size={16} />
                </button>
              </div>
              <div style={{ ...hintBox, fontSize: 11, marginTop: 10 }}>
                Tarih alanına sınavın son günü girilmeli (örn. "27-28 Ağustos" için 28 Ağustos seç) — o günden sonra otomatik geçmiş sayılır.
              </div>
            </div>

            <div style={{ ...hintBox, fontSize: 12 }}>
              Değişiklikler tüm cihazlara otomatik yansır.
            </div>
          </div>
        )}


        {/* Tüm hareketler listesi */}
        <div style={{ background: C.panel, borderRadius: 18, padding: '18px 20px', border: `1px solid ${C.border}` }}>
          {/* Arama kutusu */}
          <div style={{ position: 'relative', marginBottom: 10 }}>
            <input
              type="text"
              placeholder="🔍  Ara... (isim, kategori, tarih, araç, tutar)"
              value={aramaMetni}
              onChange={(e) => setAramaMetni(e.target.value)}
              style={{ ...inputStyle, paddingLeft: 14 }}
            />
            {aramaMetni && (
              <button onClick={() => setAramaMetni('')} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: C.textDim, cursor: 'pointer', fontSize: 16 }}>×</button>
            )}
          </div>

          {/* Kategori filtresi + Sıralama */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
            <select
              value={listeKategoriFiltre}
              onChange={(e) => setListeKategoriFiltre(e.target.value)}
              style={{ ...inputStyle, flex: 1.4, padding: '10px 12px', fontSize: 13 }}
            >
              <option value="">Tüm Kategoriler</option>
              <optgroup label="Gelir">
                {GELIR_KATEGORILERI.map((k) => <option key={'g_' + k.id} value={'gelir:' + k.id}>{k.isim}</option>)}
              </optgroup>
              <optgroup label="Gider">
                {GIDER_KATEGORILERI.map((k) => <option key={'d_' + k.id} value={'gider:' + k.id}>{k.isim}</option>)}
              </optgroup>
            </select>
            <select
              value={listeSiralama}
              onChange={(e) => setListeSiralama(e.target.value)}
              style={{ ...inputStyle, flex: 1, padding: '10px 12px', fontSize: 13 }}
            >
              <option value="yeni">En Yeni</option>
              <option value="eski">En Eski</option>
            </select>
          </div>

          {aramaOK ? (
            <>
              <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 12, color: C.textDim, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                Arama Sonuçları ({aramaSonuclari.length} kayıt)
              </div>
              {aramaSonuclari.length === 0 && <div style={{ color: C.textFaint, fontSize: 13, padding: '10px 0' }}>Sonuç bulunamadı.</div>}
              {aramaSonuclari.map((k) => (
                <div key={k.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: `1px solid ${C.border}` }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'flex', alignItems: 'center', gap: 6 }}>
                      {k.aciklama}
                      {k.odendiMi === false && <span style={{ fontSize: 9, fontWeight: 800, color: C.gold, background: 'rgba(240,200,104,0.15)', padding: '2px 6px', borderRadius: 6, flexShrink: 0 }}>VERESİYE</span>}
                    </div>
                    <div style={{ fontSize: 11, color: C.textFaint }}>
                      {k.tarih} · {katAdi(k.kategori, k.tip === 'gelir' ? GELIR_KATEGORILERI : GIDER_KATEGORILERI)} · {ODEME_TIPLERI.find(o => o.id === k.odeme)?.isim || ''}{k.sinavTarihi ? ` · ${k.sinavTarihi}` : ''}{k.egitmen ? ` · ${egitmenAdi(k.egitmen)}` : ''}{k.arac ? ` · ${aracAdi(k.arac)}` : ''}{k.not ? ` · ${k.not}` : ''}
                    </div>
                  </div>
                  <div style={{ fontWeight: 800, fontSize: 14, color: k.odendiMi === false ? C.textFaint : (k.tip === 'gelir' ? C.mint : C.rose), marginLeft: 10, fontFamily: "'JetBrains Mono', monospace" }}>
                    {k.tip === 'gelir' ? '+' : '−'}{fmt(k.kalan)}
                  </div>
                  <button onClick={() => setDuzenleModal({ ...k })} style={{ background: 'none', border: 'none', color: C.textFaint, cursor: 'pointer', marginLeft: 4, padding: 4 }}>
                    <Receipt size={14} />
                  </button>
                  <button onClick={() => { if (window.confirm('Bu kaydı silmek istediğinizden emin misiniz?')) sil(k.id); }} style={{ background: 'none', border: 'none', color: C.textFaint, cursor: 'pointer', marginLeft: 4, padding: 4 }}>
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
            </>
          ) : (
            <>
              <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 12, color: C.textDim, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                {ayAdi(secilenAy + '-01')} Tüm Hareketler
              </div>
              {buAyKayitlarFiltreli.length === 0 && <div style={{ color: C.textFaint, fontSize: 13, padding: '10px 0' }}>{listeKategoriFiltre ? 'Bu kategoride kayıt yok.' : 'Bu ay için kayıt yok.'}</div>}
              {buAyKayitlarFiltreli.map((k) => (
                <div key={k.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: `1px solid ${C.border}` }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'flex', alignItems: 'center', gap: 6 }}>
                      {k.aciklama}
                      {k.odendiMi === false && <span style={{ fontSize: 9, fontWeight: 800, color: C.gold, background: 'rgba(240,200,104,0.15)', padding: '2px 6px', borderRadius: 6, flexShrink: 0 }}>VERESİYE</span>}
                    </div>
                    <div style={{ fontSize: 11, color: C.textFaint }}>
                      {k.tarih} · {katAdi(k.kategori, k.tip === 'gelir' ? GELIR_KATEGORILERI : GIDER_KATEGORILERI)} · {ODEME_TIPLERI.find(o => o.id === k.odeme)?.isim || ''}{k.sinavTarihi ? ` · ${k.sinavTarihi}` : ''}{k.egitmen ? ` · ${egitmenAdi(k.egitmen)}` : ''}{k.arac ? ` · ${aracAdi(k.arac)}` : ''}{k.islemYapan ? ` · ${ISLEM_YAPAN.find(p => p.id === k.islemYapan)?.isim}` : ''}{k.not ? ` · ${k.not}` : ''}
                    </div>
                  </div>
                  <div style={{ fontWeight: 800, fontSize: 14, color: k.odendiMi === false ? C.textFaint : (k.tip === 'gelir' ? C.mint : C.rose), marginLeft: 10, fontFamily: "'JetBrains Mono', monospace" }}>
                    {k.tip === 'gelir' ? '+' : '−'}{fmt(k.kalan)}
                  </div>
                  <button onClick={() => setDuzenleModal({ ...k })} style={{ background: 'none', border: 'none', color: C.textFaint, cursor: 'pointer', marginLeft: 4, padding: 4 }}>
                    <Receipt size={14} />
                  </button>
                  <button onClick={() => { if (window.confirm('Bu kaydı silmek istediğinizden emin misiniz?')) sil(k.id); }} style={{ background: 'none', border: 'none', color: C.textFaint, cursor: 'pointer', marginLeft: 4, padding: 4 }}>
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
            </>
          )}
        </div>

        <p style={{ textAlign: 'center', color: C.textFaint, fontSize: 11, marginTop: 16 }}>
          Sürücü Kursu Kasası · Veriler bulutta saklanır
        </p>
      </div>

      {/* Transfer Modalı */}
      {transferModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 200 }}>
          <div style={{ background: C.panel, borderRadius: '20px 20px 0 0', padding: '24px 20px', width: '100%', maxWidth: 520, border: `1px solid ${C.borderLight}`, maxHeight: '85vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
              <span style={{ fontWeight: 700, fontSize: 16, color: C.text }}>💸 Kasa İçi Transfer</span>
              <button onClick={() => setTransferModal(null)} style={{ background: 'none', border: 'none', color: C.textDim, cursor: 'pointer' }}><X size={22} /></button>
            </div>
            <div style={{ background: 'rgba(59,130,246,0.06)', padding: '12px 14px', borderRadius: 12, marginBottom: 16, fontSize: 12, color: C.textDim, border: '1px solid rgba(59,130,246,0.2)' }}>
              Bu işlem kâr/zarar hesabına girmez. Sadece iki hesap arasında para taşınır (POS→Havale, Nakit→Havale gibi).
            </div>

            <label style={labelStyle}>Tarih</label>
            <input type="date" value={transferModal.tarih} onChange={(e) => setTransferModal({ ...transferModal, tarih: e.target.value })} style={{ ...inputStyle, marginBottom: 14 }} />

            <label style={labelStyle}>Kaynak Hesap (nereden çıkacak)</label>
            <select
              value={transferModal.kaynak}
              onChange={(e) => setTransferModal({ ...transferModal, kaynak: e.target.value })}
              style={{ ...inputStyle, marginBottom: 14 }}
            >
              {ODEME_TIPLERI.map((o) => <option key={o.id} value={o.id}>{o.isim}</option>)}
            </select>

            <label style={labelStyle}>Hedef Hesap (nereye girecek)</label>
            <select
              value={transferModal.hedef}
              onChange={(e) => setTransferModal({ ...transferModal, hedef: e.target.value })}
              style={{ ...inputStyle, marginBottom: 14 }}
            >
              {ODEME_TIPLERI.map((o) => <option key={o.id} value={o.id}>{o.isim}</option>)}
            </select>

            <label style={labelStyle}>Tutar (₺)</label>
            <input type="number" value={transferModal.tutar} placeholder="0" onChange={(e) => setTransferModal({ ...transferModal, tutar: e.target.value })} style={{ ...inputStyle, marginBottom: 14 }} />

            <label style={labelStyle}>Not (opsiyonel)</label>
            <input type="text" value={transferModal.not} placeholder="örn: POS gelirini bankaya çektim" onChange={(e) => setTransferModal({ ...transferModal, not: e.target.value })} style={{ ...inputStyle, marginBottom: 20 }} />

            <button onClick={transferKaydet} style={{ width: '100%', padding: '14px', borderRadius: 12, border: 'none', cursor: 'pointer', background: `linear-gradient(135deg, ${C.blue}, ${C.blueDeep})`, color: '#FFFFFF', fontWeight: 700, fontSize: 15 }}>
              Transferi Kaydet
            </button>
          </div>
        </div>
      )}

      {/* Kayıt Düzenleme Modalı */}
      {duzenleModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 200 }}>
          <div style={{ background: C.panel, borderRadius: '20px 20px 0 0', padding: '24px 20px', width: '100%', maxWidth: 520, border: `1px solid ${C.borderLight}`, maxHeight: '85vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
              <span style={{ fontWeight: 800, fontSize: 16 }}>Kaydı Düzenle</span>
              <button onClick={() => setDuzenleModal(null)} style={{ background: 'none', border: 'none', color: C.textDim, cursor: 'pointer' }}><X size={22} /></button>
            </div>

            <label style={labelStyle}>Tarih</label>
            <input type="date" value={duzenleModal.tarih} onChange={(e) => setDuzenleModal({ ...duzenleModal, tarih: e.target.value })} style={{ ...inputStyle, marginBottom: 12 }} />

            <label style={labelStyle}>Açıklama</label>
            <input type="text" value={duzenleModal.aciklama} onChange={(e) => setDuzenleModal({ ...duzenleModal, aciklama: e.target.value })} style={{ ...inputStyle, marginBottom: 12 }} />

            <label style={labelStyle}>Kategori</label>
            <select value={duzenleModal.kategori} onChange={(e) => setDuzenleModal({ ...duzenleModal, kategori: e.target.value })} style={{ ...inputStyle, marginBottom: 12 }}>
              {(duzenleModal.tip === 'gelir' ? GELIR_KATEGORILERI : GIDER_KATEGORILERI).map((kat) => <option key={kat.id} value={kat.id}>{kat.isim}</option>)}
            </select>

            <label style={labelStyle}>Tutar (₺)</label>
            <input type="number" value={duzenleModal.tutar} onChange={(e) => setDuzenleModal({ ...duzenleModal, tutar: parseFloat(e.target.value) || 0, kalan: parseFloat(e.target.value) || 0 })} style={{ ...inputStyle, marginBottom: 12 }} />

            <label style={labelStyle}>Ödeme Şekli</label>
            <select value={duzenleModal.odeme} onChange={(e) => setDuzenleModal({ ...duzenleModal, odeme: e.target.value })} style={{ ...inputStyle, marginBottom: 12 }}>
              {ODEME_TIPLERI.map((o) => <option key={o.id} value={o.id}>{o.isim}</option>)}
            </select>

            <label style={labelStyle}>Not</label>
            <input type="text" value={duzenleModal.not || ''} onChange={(e) => setDuzenleModal({ ...duzenleModal, not: e.target.value })} style={{ ...inputStyle, marginBottom: 16 }} />

            {/* Sınav tarihi — hem harç geliri hem harç ödemesi için */}
            {(duzenleModal.kategori === 'harc' || duzenleModal.kategori === 'harc_odeme') && (
              <>
                <label style={labelStyle}>Hangi Sınav İçin?</label>
                <select
                  value={duzenleModal.sinavTarihi || ''}
                  onChange={(e) => setDuzenleModal({ ...duzenleModal, sinavTarihi: e.target.value })}
                  style={{ ...inputStyle, marginBottom: 16 }}
                >
                  <option value="">Seçilmedi (genel)</option>
                  {SINAV_TARIHLERI.map((s) => <option key={s.id} value={s.etiket}>{s.etiket}</option>)}
                </select>
              </>
            )}

            {duzenleModal.tip === 'gelir' && duzenleModal.kategori === 'harc' && (
              <>
                <label style={labelStyle}>Ödeme Durumu</label>
                <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
                  <button
                    onClick={() => setDuzenleModal({ ...duzenleModal, odendiMi: true })}
                    style={{ flex: 1, padding: '12px', borderRadius: 10, cursor: 'pointer', fontWeight: 700, fontSize: 13, border: duzenleModal.odendiMi !== false ? `1px solid ${C.mint}` : `1px solid ${C.border}`, background: duzenleModal.odendiMi !== false ? 'rgba(95,230,168,0.12)' : C.bg, color: duzenleModal.odendiMi !== false ? C.mint : C.textDim }}
                  >
                    Ödendi
                  </button>
                  <button
                    onClick={() => setDuzenleModal({ ...duzenleModal, odendiMi: false })}
                    style={{ flex: 1, padding: '12px', borderRadius: 10, cursor: 'pointer', fontWeight: 700, fontSize: 13, border: duzenleModal.odendiMi === false ? `1px solid ${C.gold}` : `1px solid ${C.border}`, background: duzenleModal.odendiMi === false ? 'rgba(240,200,104,0.12)' : C.bg, color: duzenleModal.odendiMi === false ? C.gold : C.textDim }}
                  >
                    Veresiye
                  </button>
                </div>
              </>
            )}


            <button onClick={duzenleKaydet} style={{ width: '100%', padding: '14px', borderRadius: 12, border: 'none', cursor: 'pointer', background: `linear-gradient(135deg, #0A2540, #1E3A5F)`, color: '#FFFFFF', fontWeight: 700, fontSize: 15 }}>
              Kaydet
            </button>
          </div>
        </div>
      )}

      {/* Hata toast */}
      {hataMesaji && (
        <div
          onClick={() => setHataMesaji(null)}
          style={{
            position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
            background: C.rose, color: '#2A1815', padding: '12px 24px', borderRadius: 100,
            fontWeight: 700, fontSize: 13, boxShadow: '0 8px 30px -8px rgba(240,146,138,0.6)',
            display: 'flex', alignItems: 'center', gap: 8, zIndex: 100, cursor: 'pointer', maxWidth: '90%',
          }}
        >
          ⚠ {hataMesaji}
        </div>
      )}
    </div>
  );
}

const labelStyle = {
  display: 'block', fontSize: 11, fontWeight: 700, color: C.textDim,
  marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.08em',
};

const inputStyle = {
  width: '100%', padding: '13px 14px', borderRadius: 12, border: `1px solid ${C.border}`,
  background: C.bg, color: C.text, fontSize: 14, outline: 'none', boxSizing: 'border-box',
  fontFamily: "'Inter', sans-serif",
};

const hintBox = {
  background: 'rgba(95,230,168,0.08)', border: `1px solid rgba(95,230,168,0.25)`,
  borderRadius: 10, padding: '10px 12px', fontSize: 12, color: C.textDim,
};

const navBtn = (C) => ({
  width: 42, height: 42, borderRadius: 12, border: `1px solid ${C.border}`, background: C.panel,
  color: C.textDim, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
});
