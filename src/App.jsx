import React, { useState, useMemo, useEffect } from 'react';
import {
  Plus, TrendingUp, TrendingDown, Trash2, Wallet, Calendar, ChevronLeft, ChevronRight,
  Car, Receipt, Banknote, CreditCard, ArrowLeftRight, Lock, Unlock, ArrowRight, Eye, EyeOff, X
} from 'lucide-react';
import { supabase } from './supabaseClient';

const EGITMENLER = [
  { id: 'meryem', isim: 'Meryem İnli' },
  { id: 'gulsen', isim: 'Gülsen Kahraman' },
  { id: 'ahmet', isim: 'Ahmet Önür' },
];

const ARACLAR = [
  { id: 'sk', isim: '34 SK' },
  { id: 'bhh', isim: '34 BHH' },
  { id: 'hge', isim: '34 HGE' },
];

const PERSONEL = [
  { id: 'sevgi', isim: 'Sevgi Karakuş', gorev: 'Müdür' },
  { id: 'gulten', isim: 'Gülten Hanım', gorev: 'Temizlikçi' },
  { id: 'sercan', isim: 'Sercan Polat', gorev: 'Motosiklet Hocası' },
  { id: 'meryem_p', isim: 'Meryem İnli', gorev: 'Direksiyon Hocası' },
  { id: 'gulsen_p', isim: 'Gülsen Kahraman', gorev: 'Direksiyon Hocası' },
  { id: 'ahmet_p', isim: 'Ahmet Önür', gorev: 'Direksiyon Hocası' },
  { id: 'parttime', isim: 'Part-Time Hoca (isim belirt)', gorev: 'Serbest' },
];

const GELIR_KATEGORILERI = [
  { id: 'kursiyer', isim: 'Kursiyer Ödemesi' },
  { id: 'ikinci_dosya', isim: '2. Direksiyon Dosyası' },
  { id: 'ozel_ders', isim: 'Özel Ders' },
  { id: 'harc', isim: 'Harç Geliri' },
  { id: 'komisyon', isim: 'Komisyon Geliri' },
];

const GIDER_KATEGORILERI = [
  { id: 'kira', isim: 'Kira' },
  { id: 'personel', isim: 'Personel Maaşı' },
  { id: 'yakit', isim: 'Yakıt/Bakım (Araç)' },
  { id: 'sgk', isim: 'SGK Ödemesi' },
  { id: 'vergi', isim: 'Vergi Ödemesi' },
  { id: 'arac_bakim', isim: 'Araç Bakım (Genel)' },
  { id: 'mutfak', isim: 'Mutfak/Temizlik/Kırtasiye' },
  { id: 'faturalar', isim: 'Faturalar (Elektrik/Su/İnternet)' },
  { id: 'reklam', isim: 'Reklam' },
  { id: 'kisisel', isim: 'Kişisel Çekim' },
  { id: 'gecici_cekim', isim: 'Geçici Çekim / Avans' },
  { id: 'diger', isim: 'Diğer' },
];

const ODEME_TIPLERI = [
  { id: 'nakit', isim: 'Nakit', icon: Banknote },
  { id: 'havale', isim: 'Havale/EFT', icon: ArrowLeftRight },
  { id: 'pos', isim: 'Kredi Kartı/POS', icon: CreditCard },
];

const ISLEM_YAPAN = [
  { id: 'ilyas', isim: 'İlyas Bey' },
  { id: 'sevgi', isim: 'Sevgi Hanım' },
];

const RAPOR_PIN = '1234';

const bugun = () => new Date().toISOString().slice(0, 10);
const ayAdi = (tarih) => new Date(tarih).toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' });
const ayAnahtari = (tarih) => tarih.slice(0, 7);
const fmt = (n) => (n || 0).toLocaleString('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + ' ₺';
const gunSayisi = (ayKey) => {
  const [yil, ay] = ayKey.split('-').map(Number);
  return new Date(yil, ay, 0).getDate();
};
const katAdi = (id, liste) => liste.find((x) => x.id === id)?.isim || id;

// ---- Palette ----
const C = {
  bg: '#080F0D',
  panel: '#101C18',
  panelAlt: '#172620',
  border: '#22352D',
  borderLight: '#35543F',
  text: '#F2F7F4',
  textDim: '#90AC9F',
  textFaint: '#56716A',
  mint: '#5FF0AC',
  mintDeep: '#2C8A66',
  gold: '#F0C868',
  rose: '#F0928A',
  roseDeep: '#7A3E36',
  blue: '#7FB6E8',
};

const FONT_IMPORT = (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;700;800&family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@500;700;800&display=swap');
    .scka-display { font-family: 'Space Grotesk', sans-serif; }
    .scka-mono { font-family: 'JetBrains Mono', monospace; }
    @keyframes scka-pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.55; } }
    @keyframes scka-rise { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
    .scka-card { animation: scka-rise 0.35s ease-out; }
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
});

export default function MuhasebeApp() {
  const [kayitlar, setKayitlar] = useState([]);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [hataMesaji, setHataMesaji] = useState(null);

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


  // Görünüm: 'giris' (sekreter) | 'rapor' (sahip, pin korumalı)
  const [ekran, setEkran] = useState('giris');
  const [pinModal, setPinModal] = useState(false);
  const [pinGiris, setPinGiris] = useState('');
  const [pinHata, setPinHata] = useState(false);
  const [raporAcik, setRaporAcik] = useState(false);

  const [tip, setTip] = useState('gelir');
  const [form, setForm] = useState({
    tarih: bugun(), aciklama: '', kategori: '', tutar: '', harcAlinan: '', personel: '', egitmen: '', arac: '', odeme: 'nakit', islemYapan: 'sevgi', not: '',
  });
  const [secilenAy, setSecilenAy] = useState(ayAnahtari(bugun()));
  const [gorunum, setGorunum] = useState('ozet');
  const [secilenGun, setSecilenGun] = useState(null);
  const [secilenGiderKat, setSecilenGiderKat] = useState(null);
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

    setForm({ tarih: bugun(), aciklama: '', kategori: '', tutar: '', harcAlinan: '', personel: '', egitmen: '', arac: '', odeme: 'nakit', islemYapan: form.islemYapan, not: '' });
  };

  const sil = async (id) => {
    const { error } = await supabase.from('kayitlar').delete().eq('id', id);
    if (error) {
      setHataMesaji('Kayıt silinemedi: ' + error.message);
      return;
    }
    setKayitlar(kayitlar.filter((k) => k.id !== id));
  };

  const aylar = useMemo(() => {
    const set = new Set(kayitlar.map((k) => ayAnahtari(k.tarih)));
    set.add(ayAnahtari(bugun()));
    return Array.from(set).sort().reverse();
  }, [kayitlar]);

  const buAyKayitlar = kayitlar.filter((k) => ayAnahtari(k.tarih) === secilenAy);

  // Net hesap: "Geçici Çekim/Avans" hiçbir şekilde kâr/zarara dahil edilmez
  const karZararaDahil = (k) => k.kategori !== 'gecici_cekim';

  const toplamGelir = buAyKayitlar.filter((k) => k.tip === 'gelir').reduce((s, k) => s + k.kalan, 0);
  const toplamGider = buAyKayitlar.filter((k) => k.tip === 'gider' && karZararaDahil(k)).reduce((s, k) => s + k.kalan, 0);
  const net = toplamGelir - toplamGider;

  const toplamHarcTahsilat = buAyKayitlar.filter((k) => k.tip === 'gelir' && k.kategori === 'harc').reduce((s, k) => s + k.tutar, 0);
  const toplamHarcKalan = buAyKayitlar.filter((k) => k.tip === 'gelir' && k.kategori === 'harc').reduce((s, k) => s + k.kalan, 0);
  const ozelDersToplam = buAyKayitlar.filter((k) => k.tip === 'gelir' && k.kategori === 'ozel_ders').reduce((s, k) => s + k.tutar, 0);
  const ozelDersKursaKalan = buAyKayitlar.filter((k) => k.tip === 'gelir' && k.kategori === 'ozel_ders').reduce((s, k) => s + k.kalan, 0);
  const kisiselCekim = buAyKayitlar.filter((k) => k.tip === 'gider' && k.kategori === 'kisisel').reduce((s, k) => s + k.kalan, 0);
  const geciciCekim = buAyKayitlar.filter((k) => k.tip === 'gider' && k.kategori === 'gecici_cekim').reduce((s, k) => s + k.kalan, 0);

  const kasaHesapla = (kayitlarListesi) => {
    const sonuc = { nakit: 0, havale: 0, pos: 0 };
    kayitlarListesi.forEach((k) => {
      const tutar = k.tip === 'gelir' ? k.kalan : -k.kalan;
      sonuc[k.odeme] = (sonuc[k.odeme] || 0) + tutar;
    });
    return sonuc;
  };
  const kasaAy = kasaHesapla(buAyKayitlar);

  const gelirKategorileri = useMemo(() => {
    const map = {};
    buAyKayitlar.filter((k) => k.tip === 'gelir').forEach((k) => { map[k.kategori] = (map[k.kategori] || 0) + k.kalan; });
    return GELIR_KATEGORILERI.map((g) => ({ ...g, tutar: map[g.id] || 0 })).filter((g) => g.tutar !== 0);
  }, [buAyKayitlar]);

  const giderKategorileri = useMemo(() => {
    const map = {};
    buAyKayitlar.filter((k) => k.tip === 'gider').forEach((k) => { map[k.kategori] = (map[k.kategori] || 0) + k.kalan; });
    return GIDER_KATEGORILERI.map((g) => ({ ...g, tutar: map[g.id] || 0 })).filter((g) => g.tutar !== 0).sort((a, b) => b.tutar - a.tutar);
  }, [buAyKayitlar]);
  const maxGiderKat = giderKategorileri.length ? Math.max(...giderKategorileri.map(g => g.tutar)) : 1;
  const maxGelirKat = gelirKategorileri.length ? Math.max(...gelirKategorileri.map((g) => g.tutar)) : 1;

  const egitmenKirilimi = useMemo(() => {
    return EGITMENLER.map((e) => {
      const kayitlarE = buAyKayitlar.filter((k) => k.egitmen === e.id);
      const gelir = kayitlarE.filter((k) => k.tip === 'gelir').reduce((s, k) => s + k.kalan, 0);
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
      const gKayitlar = kayitlar.filter((k) => k.tarih === tarih);
      const gelir = gKayitlar.filter((k) => k.tip === 'gelir').reduce((s, k) => s + k.kalan, 0);
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

  const secilenGunKayitlar = secilenGun ? kayitlar.filter((k) => k.tarih === secilenGun) : [];
  const kasaGun = secilenGun ? kasaHesapla(secilenGunKayitlar) : { nakit: 0, havale: 0, pos: 0 };

  const ayDegistir = (yon) => {
    const [yil, ay] = secilenAy.split('-').map(Number);
    const yeniTarih = new Date(yil, ay - 1 + yon, 1);
    const yeniKey = `${yeniTarih.getFullYear()}-${String(yeniTarih.getMonth() + 1).padStart(2, '0')}`;
    setSecilenAy(yeniKey);
    setSecilenGun(null);
  };

  const egitmenAdi = (id) => EGITMENLER.find((e) => e.id === id)?.isim || '';
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
          <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
            {['gelir', 'gider'].map((t) => (
              <button
                key={t}
                onClick={() => { setTip(t); setForm({ ...form, kategori: '', harcAlinan: '', personel: '' }); }}
                style={{
                  flex: 1, padding: '18px', borderRadius: 16, border: 'none', cursor: 'pointer',
                  background: tip === t ? (t === 'gelir' ? `linear-gradient(135deg, ${C.mintDeep}, #1F5C42)` : `linear-gradient(135deg, ${C.roseDeep}, #5A2B25)`) : C.panel,
                  color: tip === t ? C.text : C.textDim,
                  fontWeight: 800, fontSize: 15,
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

          {/* Form kartı */}
          <div className="scka-card" style={{ background: `linear-gradient(165deg, ${C.panel} 0%, ${C.panelAlt} 100%)`, borderRadius: 20, padding: '22px', border: `1px solid ${C.border}`, marginBottom: 18, boxShadow: '0 20px 60px -30px rgba(0,0,0,0.6)' }}>

            <label style={labelStyle}>Kategori</label>
            <select value={form.kategori} onChange={(e) => setForm({ ...form, kategori: e.target.value })} style={{ ...inputStyle, marginBottom: 14 }}>
              <option value="">Kategori seç</option>
              {(tip === 'gelir' ? GELIR_KATEGORILERI : GIDER_KATEGORILERI).map((k) => <option key={k.id} value={k.id}>{k.isim}</option>)}
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
                <label style={labelStyle}>Devlete giden harç tutarı (₺)</label>
                <input
                  type="number"
                  placeholder="örn: 2000"
                  value={form.harcAlinan}
                  onChange={(e) => setForm({ ...form, harcAlinan: e.target.value })}
                  style={inputStyle}
                />
                {form.tutar && (
                  <div style={{ ...hintBox, marginTop: 8 }}>
                    Kursa kalan: <strong style={{ color: C.mint }}>{fmt((parseFloat(form.tutar) || 0) - (parseFloat(form.harcAlinan) || 0))}</strong>
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
                background: `linear-gradient(135deg, ${C.mint}, #34CC8E)`, color: '#04140D', fontWeight: 800, fontSize: 16,
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
                <button onClick={() => sil(k.id)} style={{ background: 'none', border: 'none', color: C.textFaint, cursor: 'pointer', marginLeft: 8, padding: 4 }}>
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>

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
                  background: `linear-gradient(135deg, ${C.mint}, #3DBF87)`, color: '#062017', fontWeight: 800, fontSize: 14,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                }}
              >
                Aç <ArrowRight size={16} />
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
          ].map((v) => (
            <button
              key={v.k}
              onClick={() => setGorunum(v.k)}
              style={{
                flex: '1 1 22%', padding: '10px 4px', borderRadius: 10, cursor: 'pointer',
                background: gorunum === v.k ? C.mint : C.panel,
                color: gorunum === v.k ? '#062017' : C.textDim,
                fontWeight: 800, fontSize: 12, border: gorunum === v.k ? 'none' : `1px solid ${C.border}`,
                transition: 'all 0.12s',
              }}
            >
              {v.l}
            </button>
          ))}
        </div>

        {gorunum === 'ozet' && (
          <>
            {/* Hero kart */}
            <div
              className="scka-card"
              style={{
                background: net >= 0
                  ? `radial-gradient(circle at 85% -10%, rgba(95,240,172,0.18), transparent 55%), linear-gradient(165deg, #16352A 0%, #0D241B 55%, ${C.bg} 100%)`
                  : `radial-gradient(circle at 85% -10%, rgba(240,146,138,0.18), transparent 55%), linear-gradient(165deg, #3A1E1B 0%, #271613 55%, ${C.bg} 100%)`,
                borderRadius: 24, padding: '28px 24px', marginBottom: 14,
                border: `1px solid ${net >= 0 ? 'rgba(95,240,172,0.22)' : 'rgba(240,146,138,0.22)'}`,
                position: 'relative', overflow: 'hidden',
              }}
            >
              <div style={{ fontSize: 11, color: C.textDim, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.2em', fontWeight: 700 }}>
                {net >= 0 ? 'Net Kâr' : 'Net Zarar'} · {ayAdi(secilenAy + '-01')}
              </div>
              <div className="scka-mono" style={{ fontSize: 44, fontWeight: 800, color: net >= 0 ? C.mint : C.rose, letterSpacing: '-0.03em', textShadow: net >= 0 ? '0 0 30px rgba(95,240,172,0.35)' : '0 0 30px rgba(240,146,138,0.35)' }}>
                {net >= 0 ? '+' : '−'}{fmt(Math.abs(net))}
              </div>
              <div style={{ display: 'flex', gap: 24, marginTop: 18 }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: C.mint, fontSize: 11, marginBottom: 3, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                    <TrendingUp size={13} /> Net Gelir
                  </div>
                  <div className="scka-mono" style={{ fontSize: 19, fontWeight: 800 }}>{fmt(toplamGelir)}</div>
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: C.rose, fontSize: 11, marginBottom: 3, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                    <TrendingDown size={13} /> Gider
                  </div>
                  <div className="scka-mono" style={{ fontSize: 19, fontWeight: 800 }}>{fmt(toplamGider)}</div>
                </div>
              </div>
            </div>

            {/* Kasa durumu */}
            <div style={{ background: C.panel, borderRadius: 18, padding: '16px 18px', marginBottom: 14, border: `1px solid ${C.border}` }}>
              <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 12, color: C.textDim, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Kasa Durumu · Ay Toplamı</div>
              <div style={{ display: 'flex', gap: 8 }}>
                <KasaKart icon={Banknote} label="Nakit" deger={kasaAy.nakit} vurgu />
                <KasaKart icon={ArrowLeftRight} label="Havale" deger={kasaAy.havale} vurgu />
                <KasaKart icon={CreditCard} label="POS" deger={kasaAy.pos} vurgu />
              </div>
            </div>

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
                {gelirKategorileri.map((g) => (
                  <div key={g.id} style={{ marginBottom: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 5 }}>
                      <span style={{ color: C.text, fontWeight: 600 }}>{g.isim}</span>
                      <span style={{ fontWeight: 800, fontFamily: "'JetBrains Mono', monospace" }}>{fmt(g.tutar)}</span>
                    </div>
                    <div style={{ height: 7, background: C.bg, borderRadius: 4, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${(g.tutar / maxGelirKat) * 100}%`, background: `linear-gradient(90deg, ${C.mintDeep}, ${C.mint})`, borderRadius: 4 }} />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {giderKategorileri.length > 0 && (
              <div style={{ background: C.panel, borderRadius: 18, padding: '18px 20px', marginBottom: 14, border: `1px solid ${C.border}` }}>
                <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 14, color: C.textDim, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Gider Dağılımı</div>
                {giderKategorileri.map((g) => {
                  const acik = secilenGiderKat === g.id;
                  const detayKayitlari = buAyKayitlar.filter((k) => k.tip === 'gider' && k.kategori === g.id);
                  return (
                    <div key={g.id} style={{ marginBottom: 12 }}>
                      <div
                        onClick={() => setSecilenGiderKat(acik ? null : g.id)}
                        style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 5, cursor: 'pointer' }}
                      >
                        <span style={{ color: g.id === 'gecici_cekim' ? C.gold : C.text, fontWeight: 600 }}>
                          {g.isim}{g.id === 'gecici_cekim' ? ' (k/z hariç)' : ''}
                        </span>
                        <span style={{ fontWeight: 800, fontFamily: "'JetBrains Mono', monospace" }}>{fmt(g.tutar)}</span>
                      </div>
                      <div
                        onClick={() => setSecilenGiderKat(acik ? null : g.id)}
                        style={{ height: 7, background: C.bg, borderRadius: 4, overflow: 'hidden', cursor: 'pointer' }}
                      >
                        <div style={{ height: '100%', width: `${(g.tutar / maxGiderKat) * 100}%`, background: g.id === 'gecici_cekim' ? `linear-gradient(90deg, #8A6E2E, ${C.gold})` : `linear-gradient(90deg, ${C.roseDeep}, ${C.rose})`, borderRadius: 4 }} />
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
          </>
        )}

        {gorunum === 'gunluk' && (
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
                <div style={{ fontWeight: 800, fontSize: 13, marginBottom: 10, color: C.text }}>
                  {new Date(secilenGun).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', weekday: 'long' })}
                </div>

                <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
                  <KasaKart icon={Banknote} label="Nakit" deger={kasaGun.nakit} vurgu />
                  <KasaKart icon={ArrowLeftRight} label="Havale" deger={kasaGun.havale} vurgu />
                  <KasaKart icon={CreditCard} label="POS" deger={kasaGun.pos} vurgu />
                </div>

                {secilenGunKayitlar.length === 0 && <div style={{ color: C.textFaint, fontSize: 13 }}>Bu gün için kayıt yok.</div>}
                {secilenGunKayitlar.map((k) => (
                  <div key={k.id} style={{ padding: '9px 0', borderBottom: `1px solid ${C.border}` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: 13, fontWeight: 600 }}>{k.aciklama}</span>
                      <span style={{ fontWeight: 800, fontSize: 13, color: k.tip === 'gelir' ? C.mint : C.rose, fontFamily: "'JetBrains Mono', monospace" }}>
                        {k.tip === 'gelir' ? '+' : '−'}{fmt(k.kalan)}
                      </span>
                    </div>
                    <div style={{ fontSize: 11, color: C.textFaint }}>
                      {katAdi(k.kategori, k.tip === 'gelir' ? GELIR_KATEGORILERI : GIDER_KATEGORILERI)} · {ODEME_TIPLERI.find(o=>o.id===k.odeme)?.isim}{k.egitmen ? ` · ${egitmenAdi(k.egitmen)}` : ''}{k.arac ? ` · ${aracAdi(k.arac)}` : ''}{k.islemYapan ? ` · ${ISLEM_YAPAN.find(p=>p.id===k.islemYapan)?.isim}` : ''}{k.not ? ` · ${k.not}` : ''}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
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


        {/* Tüm hareketler listesi */}
        <div style={{ background: C.panel, borderRadius: 18, padding: '18px 20px', border: `1px solid ${C.border}` }}>
          <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 12, color: C.textDim, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            {ayAdi(secilenAy + '-01')} Tüm Hareketler
          </div>
          {buAyKayitlar.length === 0 && <div style={{ color: C.textFaint, fontSize: 13, padding: '10px 0' }}>Bu ay için kayıt yok.</div>}
          {[...buAyKayitlar].reverse().map((k) => (
            <div key={k.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: `1px solid ${C.border}` }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{k.aciklama}</div>
                <div style={{ fontSize: 11, color: C.textFaint }}>
                  {k.tarih} · {katAdi(k.kategori, k.tip === 'gelir' ? GELIR_KATEGORILERI : GIDER_KATEGORILERI)} · {ODEME_TIPLERI.find(o=>o.id===k.odeme)?.isim}{k.egitmen ? ` · ${egitmenAdi(k.egitmen)}` : ''}{k.arac ? ` · ${aracAdi(k.arac)}` : ''}{k.islemYapan ? ` · ${ISLEM_YAPAN.find(p=>p.id===k.islemYapan)?.isim}` : ''}{k.not ? ` · ${k.not}` : ''}
                </div>
              </div>
              <div style={{ fontWeight: 800, fontSize: 14, color: k.tip === 'gelir' ? C.mint : C.rose, marginLeft: 10, fontFamily: "'JetBrains Mono', monospace" }}>
                {k.tip === 'gelir' ? '+' : '−'}{fmt(k.kalan)}
              </div>
              <button onClick={() => sil(k.id)} style={{ background: 'none', border: 'none', color: C.textFaint, cursor: 'pointer', marginLeft: 8, padding: 4 }}>
                <Trash2 size={15} />
              </button>
            </div>
          ))}
        </div>

        <p style={{ textAlign: 'center', color: C.textFaint, fontSize: 11, marginTop: 16 }}>
          Sürücü Kursu Kasası · Veriler bulutta saklanır
        </p>
      </div>

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
