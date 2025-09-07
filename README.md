# Emergency Dispatch Game 🚨

Ein browser-basiertes Notfall-Dispatch-Simulationsspiel mit dunklem, minimalistischem Design. Ähnlich wie "Leitstellenspiel", aber mit moderner Technologie und verbesserter Benutzererfahrung.

## 🎮 Spielkonzept

Spieler können:
- Feuerwachen und Rettungsstationen verwalten
- Fahrzeuge kaufen und verwalten
- Notfälle empfangen und Fahrzeuge dorthin entsenden
- Ihr Operationsgebiet erweitern
- Realistische Routenplanung mit OpenRouteService API nutzen

## 🛠 Tech Stack

- **Backend:** Laravel 11
- **Frontend:** Vue.js 3 mit Composition API
- **Datenbank:** Supabase (PostgreSQL)
- **Karten:** Leaflet.js mit OpenStreetMap
- **Routing:** OpenRouteService API
- **Styling:** Tailwind CSS (Dark Theme)
- **Real-time:** Laravel WebSockets/Pusher (geplant)
- **Version Control:** Git mit GitHub

## 🎨 Design-Prinzipien

- **Dark Theme Focus:** Alle UI-Komponenten verwenden dunkle Farben
- **Minimalistisches Design:** Saubere, ikonbasierte Oberfläche mit minimalem Text
- **Mobile Responsive:** Funktioniert gut auf Desktop und Mobile
- **Performance First:** Optimiert für schnelle Ladezeiten
- **Real-world Accuracy:** Notfallstandorte entsprechen realistischen Orten

## 🚀 Entwicklung

### Voraussetzungen
- PHP 8.2+
- Composer
- Node.js 18+
- Git

### Installation
```bash
# Repository klonen
git clone [repository-url]
cd emergency-dispatch-game

# Dependencies installieren
composer install
npm install

# Environment konfigurieren
cp .env.example .env
php artisan key:generate

# Datenbank migrieren
php artisan migrate

# Development Server starten
php artisan serve
npm run dev
```

## 📋 Roadmap

### Milestone 1: Projekt Setup & Infrastructure ✅
- [x] Projekt initialisieren
- [x] Git Repository einrichten
- [ ] Laravel Backend Setup
- [ ] Vue.js Frontend Integration
- [ ] Supabase Datenbankverbindung
- [ ] GitHub Repository Setup

### Milestone 2: Core Game Features (geplant)
- [ ] Benutzerauthentifizierung
- [ ] Station Management
- [ ] Fahrzeug Management
- [ ] Notfall-System
- [ ] Kartenintegration

### Milestone 3: Advanced Features (geplant)
- [ ] Real-time Updates
- [ ] Multiplayer Support
- [ ] Statistiken & Analytics
- [ ] Mobile App

## 🤝 Beitragen

1. Fork das Repository
2. Erstelle einen Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Committe deine Änderungen (`git commit -m 'Add some AmazingFeature'`)
4. Push zum Branch (`git push origin feature/AmazingFeature`)
5. Öffne eine Pull Request

## 📄 Lizenz

Dieses Projekt steht unter der MIT-Lizenz. Siehe `LICENSE` für Details.

## 📞 Kontakt

Projekt erstellt von [Dein Name] - [deine-email@example.com]

---

**Status:** 🚧 In Entwicklung - Milestone 1
