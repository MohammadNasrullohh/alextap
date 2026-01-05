# 🐹 Alex Tap-to-Earn Web3 Game

Game Tap-to-Earn interaktif berbasis Web3 yang berjalan di jaringan Hardhat Local. Pemain dapat mengumpulkan poin melalui mekanisme klik, melakukan upgrade untuk meningkatkan efisiensi, serta melakukan klaim poin menjadi Token ALEX secara langsung ke Smart Contract.

---

## 🚀 Fitur Unggulan

### 💾 Persistence System (Anti-Reset)
Progress pemain aman berkat sistem penyimpanan **localStorage**. Data yang tersimpan meliputi:
- **Taps & Off-chain Balance**: Poin yang belum diklaim tetap terjaga
- **Energy State**: Sisa energi sinkron dengan waktu terakhir bermain
- **Upgrade Levels**: Level Multi-Tap, Energy Boost, dan Auto Miner
- **Transaction History**: Riwayat klaim blockchain langsung di antarmuka pengguna

### 🔊 Audio & Visual Experience
- **Efek Suara**: `tap3.mp3` memberikan feedback instan saat klik
- **Floating Text**: Animasi angka yang muncul secara dinamis di titik klik
- **Combo Multiplier**: Bonus poin untuk pemain yang melakukan tap cepat beruntun
- **Dynamic UI**: Energy bar dan progress bar yang responsif

### 🛠 Web3 Integration
- **Smart Contract Sync**: Integrasi saldo token ALEX asli dari blockchain
- **Airdrop Mechanism**: Syarat minimal 100 taps untuk melakukan klaim
- **Network Guard**: Peringatan otomatis jika dompet tidak terhubung ke jaringan yang benar
- 
      ![Dashboard AlexTap](frontend/public/alex.png)

---

## 🛠️ Prasyarat & Setup

### 1. Persyaratan Sistem
- **Node.js** v16 atau lebih tinggi
- **MetaMask Browser Extension** (untuk koneksi wallet)
- **Hardhat** (untuk menjalankan blockchain lokal)
- **npm** atau **yarn** (package manager)

### 2. Struktur Folder Aset
Pastikan folder `frontend/public/` memiliki file berikut:

```
frontend/public/
├── hamster.png    # Gambar karakter utama
├── alex.png       # Screenshot dashboard game
└── tap3.mp3       # Sound effect saat tap
```

---

## 🏗️ Cara Menjalankan Project

### Langkah 1: Jalankan Blockchain Lokal

Buka terminal dan jalankan perintah berikut:

```bash
npx hardhat node
```

Terminal akan menampilkan beberapa akun test dengan private keys. Catat nomor akun yang ingin Anda gunakan.

**Output contoh:**
```
Started HTTP and WebSocket JSON-RPC server at http://127.0.0.1:8545/
```

### Langkah 2: Deploy Smart Contract

Buka terminal baru di folder root project, lalu jalankan:

```bash
npx hardhat run scripts/deploy.js --network localhost
```

⚠️ **Penting**: Salin **alamat kontrak** dari output terminal. Ini akan terlihat seperti:
```
Token deployed to: 0x5FbDB2315678afccb333f8a9c05b0cf6545ca33a
```

Perbarui variabel alamat kontrak di file `frontend/src/App.js`:

```javascript
const CONTRACT_ADDRESS = "0x5FbDB2315678afccb333f8a9c05b0cf6545ca33a"; // Ganti dengan alamat Anda
```

### Langkah 3: Jalankan Frontend

Di terminal baru, jalankan:

```bash
cd frontend
npm install
npm start
```

Aplikasi akan membuka otomatis di `http://localhost:5173`.

---

## 🎮 Mekanisme Permainan

### 🔌 Connect Wallet
1. Klik tombol **"Connect Wallet"** di sudut kanan atas
2. Pilih MetaMask dari popup
3. Pastikan network MetaMask adalah **Hardhat Local (Chain ID: 31337)**

### 👆 Tap & Earn
- Klik karakter hamster untuk mengumpulkan poin
- Setiap tap = 1 energi
- Sistem combo multiplier memberikan bonus otomatis untuk tap beruntun

### ⚡ Manage Energy
- Energi regen otomatis setiap **1.5 detik**
- Energy bar menunjukkan status energi saat ini
- Upgrade Energy Boost meningkatkan kapasitas energi maksimal

### ⬆️ Upgrades System
Tingkatkan performa dengan 3 jenis upgrade:

| Upgrade | Efek | Cost | Manfaat |
|---------|------|------|---------|
| **Multi-Tap** | Tap lebih banyak sekaligus | 500 poin | +1 poin per tap |
| **Energy Boost** | Energi maksimal bertambah | 1000 poin | +20 energi maksimal |
| **Auto Miner** | Passive income otomatis | 2000 poin | +1 poin setiap 5 detik |

### 💰 Claim Token
- Minimal **100 taps** diperlukan untuk claim
- Klik tombol **"Claim to Wallet"** untuk konversi ke Token ALEX
- Transaksi akan diproses langsung ke Smart Contract
- Riwayat transaksi tersimpan di bagian Transaction History

---

## 📁 Struktur Penyimpanan Data

Data game disimpan menggunakan key yang unik untuk versioning:

```javascript
localStorage key: "alex_tap_save_v4"
```

**Data yang disimpan:**
```json
{
  "taps": 1500,
  "balance": 450,
  "energy": 100,
  "maxEnergy": 200,
  "lastTime": 1704456600000,
  "multiTapLevel": 3,
  "energyBoostLevel": 2,
  "autoMinerLevel": 1,
  "lastAutoMinerTime": 1704456590000,
  "transactionHistory": [
    { "type": "claim", "amount": 500, "txHash": "0x...", "timestamp": 1704456600000 }
  ]
}
```

---

## ♻️ Reset Progress (Testing & Development)

Jika ingin mereset semua data pemain, buka **Browser Console** (tekan `F12` atau `Ctrl+Shift+I`), lalu jalankan:

```javascript
localStorage.removeItem("alex_tap_save_v4")
location.reload()
```

Data akan terhapus dan game akan restart dengan kondisi awal.

---

## 🔧 Troubleshooting

### MetaMask Tidak Terhubung ke Hardhat Local
1. Buka MetaMask Settings → Networks
2. Tambahkan network manual:
   - **Network Name**: Hardhat Local
   - **RPC URL**: `http://127.0.0.1:8545/`
   - **Chain ID**: `31337`
   - **Currency**: ETH

### Smart Contract Error saat Claim
- Pastikan akun MetaMask memiliki saldo ETH dummy (lihat output `hardhat node`)
- Periksa alamat kontrak di App.js sudah benar
- Refresh halaman browser

### Audio Tidak Terdengar
- Periksa file `tap3.mp3` ada di folder `frontend/public/`
- Pastikan browser tidak dalam mode silent
- Cek volume browser

### Data Hilang Setelah Refresh
- Buka Console (F12), pastikan `localStorage` tersimpan dengan key `alex_tap_save_v4`
- Jika belum ada, klik game sekali dan refresh ulang

---

## 📊 Arsitektur Project

```
alex-tap-earn/
├── contracts/                    # Smart Contract Solidity
│   ├── AlexCoin.sol                 # ERC20 Token ALEX
│   └── Airdrop.sol          # Logic game blockchain
├── scripts/
│   └── deploy.js                 # Script deploy kontrak
│   └── fund_airdrop.js          # Mengisi token ke kontrak Airdrop
├── frontend/                     # React Frontend
│   ├── src/
│   │   ├── App.jsx               # Komponen utama game
│   ├── public/
│   │   ├── hamster.png
│   │   └── tap3.mp3
│   └── package.json
├── hardhat.config.js             # Konfigurasi Hardhat
└── README.md                      # File ini
```

---

## 🛠️ Development & Customization

### Mengubah Jumlah Tap Minimum untuk Claim
Buka `frontend/src/App.js`, cari variabel:
```javascript
const MIN_TAPS_TO_CLAIM = 100; // Ubah sesuai kebutuhan
```

### Mengubah Kecepatan Regenerasi Energi
```javascript
const ENERGY_REGEN_INTERVAL = 1500; // Milliseconds
```

### Mengubah Cost Upgrade
Cari bagian upgrade pricing:
```javascript
const UPGRADE_COSTS = {
  multiTap: 500,
  energyBoost: 1000,
  autoMiner: 2000
};
```

---

## 📝 Environment Variables

Buat file `.env` di root folder (opsional untuk production):

```
REACT_APP_CONTRACT_ADDRESS=0x5FbDB2315678afccb333f8a9c05b0cf6545ca33a
REACT_APP_NETWORK_ID=31337
REACT_APP_NETWORK_NAME="Hardhat Local"
```

---

## ⚖️ Disclaimer

- **Pengembangan & Pembelajaran**: Project ini khusus untuk keperluan pengembangan dan pembelajaran Web3
- **Akun Dummy**: Selalu gunakan akun MetaMask dummy untuk testing
- **Testnet Only**: Jangan gunakan private key akun mainnet atau testnet asli
- **Liabilitas**: Developer tidak bertanggung jawab atas kerugian atau kehilangan dana
- **Audit**: Smart contract belum melewati audit keamanan profesional

---

## 📄 Lisensi

Project ini dilisensikan di bawah MIT License [MIT License](LICENSE).

---

## 🎉 Credits

Built with ❤️ for the Alex Web3 Community

**Stack Teknologi:**
- React.js - Frontend framework
- Web3.js - Ethereum blockchain interaction
- Solidity - Smart Contract language
- Hardhat - Ethereum development environment
- MetaMask - Wallet management

---

**Last Updated**: January 2026  
**Version**: 4.0.0
