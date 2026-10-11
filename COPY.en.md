# Testi del sito — frascella.dev (English)

The English version of every word the visitor reads or hears, in page order. It follows `COPY.md` line by line:
the bold labels and headings are the same as the Italian file (they map to the code), only the values are English.
English and Italian are written separately, so a line here says the same thing, not the same words.

Format notes:
- **Cut-out words** (the giant ones in the sheet) are lowercase and short.
- **aria-labels** are read by screen readers: they start with the visible word, if there is one.
- On the real site the name, the VAT number and the city are typed once, in `src/i18n.ts` (`who`).

## Registro

- Audience: companies, agencies and startups. Senior, technical tone.
- Address the reader directly, without familiarity: no "hi", no exclamation marks.
- Write it as you would say it to a CTO on a call: no punchlines, no wordplay, no colon followed by a list.
- Facts instead of adjectives. Never "solutions", "scalable", "tailored", "bespoke", "innovative", "cutting-edge".
- Technical terms, exact and unexplained.
- Each fact once, where it is needed.
- Never: 2013 and the early days, the word "backend", "I wrote it myself" and the like, the technologies of proprietary projects.

---

## Pagina

- **Titolo della scheda del browser:** Emanuele Frascella · Freelance software engineer, Taranto
- **Meta description (risultati di Google):** Freelance software engineer in Taranto, Italy, also working remotely. Web platforms, apps, and integrations with AI and agents for companies, agencies and startups.

## Intestazione

- **Logo, aria-label:** frascella.dev, back to top
- **Menu:** services · work · about
- **Lingua:** it
- **Pulsante:** contact
- **Su telefono, apri / chiudi il menu:** menu / close

## 1. Apertura

- **Parole traforate:** platforms, apps and integrations
- **Seconda riga:** from architecture to release
- **Testatina:** Taranto · CET · remote
- **Testo:**
  > I'm a freelance software engineer based in Taranto, working on projects for companies, agencies and startups. I come from telemedicine, where I worked with health data under GDPR. Today I work on the game engines behind online casino platforms, where the money is real and the services can't go down.
- **Pulsante:** Contact →
- **Indicatore di scorrimento:** scroll

## 2. La scrivania (intermezzo)

Nessun testo visibile. I punti sugli oggetti non hanno testo: sono decorativi (aria-hidden) e gli oggetti
si raggiungono con i pulsanti da tastiera qui sotto.

Pulsanti da tastiera per gli oggetti (nascosti, compaiono con Tab):

- **Gruppo:** desk objects
- **Lampada:** lamp light: full / dim / off
- **Giradischi:** record player: start or stop
- **Tazza:** mug: make it wobble
- **Pianta:** plant: make it sparkle
- **Telefono:** phone: crack the screen
- **Tablet:** tablet: draw
- **Gufo:** owl: make it fly
- **Suggerimento in modalità disegno:** Draw on the tablet screen. Press "done" or Esc to go back.

## 3. Servizi

- **Testatina:** Services
- **Titolo della sezione:** What I do.

### 01 — Piattaforme
- **Parola traforata:** platforms
- **Titolo:** Websites and web platforms
- **Testo:**
  > I build websites in WordPress or from scratch, without a CMS. For more complex platforms I also design the server side, with APIs, databases and authentication, and split it into microservices when that makes sense.

### 02 — App
- **Parola traforata:** apps
- **Titolo:** Mobile and web apps
- **Testo:**
  > iOS and Android apps in Flutter, web apps in React or Nuxt. I build them together with the server side, or connect them to the one already in place.

### 03 — Integrazioni
- **Parola traforata:** integrations
- **Titolo:** Integrations and AI
- **Testo:**
  > I connect ERPs, CRMs, payment systems and third-party services so that data moves from one to the next without anyone copying it by hand, with error handling and a log of every exchange. I also integrate LLMs and agents into existing software and connect them to the company's own data.

## 4. Lavori

- **Parola traforata:** work
- **Testatina:** Work
- **Titolo della sezione:** Four recent projects.

### 01 — seveninktattoo.it
- **Ruolo:** 01 · client
- **Testo:**
  > Website for a tattoo studio in Taranto, built with WordPress and Elementor. It handles appointment requests, reviews, the newsletter and the FAQ without relying on external services, so the data stays on the studio's own server.
- **Tecnologie:** WordPress · Elementor
- **Stato:** live
- **Testo alternativo immagine:** The seveninktattoo.it home page

### 02 — CloudGround
- **Ruolo:** 02 · personal
- **Testo:**
  > A control panel for running websites on an Ubuntu server: WordPress, WooCommerce, PHP, Laravel or static. Each site starts with its own page cache, its own isolated PHP and backups off the server, and a change goes through a staging copy first, which is not promoted if it measures slower than production.
- **Tecnologie:** Go · Vue
- **Stato:** version 0.1, public on GitHub
- **Testo alternativo immagine:** The cloudground.it home page

### 03 — skeda.fit
- **Ruolo:** 03 · co-founder
- **Testo:**
  > An app for freelance personal trainers, with workout plans, set logging at the gym, chat, check-ins and a public profile on a map. It hasn't launched yet, and the waitlist is open.
- **Tecnologie:** _nessuna — nascondere la riga per questo progetto_
- **Stato:** in development
- **Testo alternativo immagine:** The skeda.fit home page

### 04 — vitrine
- **Ruolo:** 04 · personal
- **Testo:**
  > A transparent overlay that sits behind the Windows desktop icons, with themes written as React pages. On Ubuntu I used Conky, and Windows had nothing like it. It starts with the PC and I use it every day.
- **Tecnologie:** C# · WPF · WebView2
- **Stato:** public on GitHub
- **Testo alternativo immagine:** vitrine on the Windows desktop

## 5. Chi sono

- **Parola traforata:** about
- **Titolo:** I like building the things I use.
- **Primo paragrafo:**
  > Many of my projects start from a need of my own, when a tool doesn't exist or doesn't do what I need. Using them every day means I also have to get right what a demo never shows, such as response times, edge cases and what happens when something fails. Right now I'm focusing on AI in software, agents and knowledge graphs in particular, and on getting them to work with real data rather than sample data.
- **Secondo paragrafo:**
  > As a freelancer I work on my own, so you talk directly to the person who writes the code. Outside work I go to the gym and design tattoos in Procreate.
- **Dati (valore / etichetta):**
  - CET / remote, other time zones included
  - NDA / signed before I see the project
  - 2 working days / to get back to you

## 6. Contatti

- **Parola traforata:** contact
- **Testo:**
  > Tell me what you need, what already exists and when you need it by. A few lines are enough; we can go through the details on a call.
- **Indirizzo (al posto del modulo):** emanuele@frascella.dev →

## 7. Footer

- **Riga sotto il logo:** Freelance software engineer · Taranto, CET
- **Note legali:** © 2026 Emanuele Frascella · VAT no. 03462650734
- **Colonna "Indice":** Index — services · work · about · contact
- **Colonna "Altrove":** Elsewhere — github · linkedin
- **Colonna "Legale":** Legal — privacy
- **Colonna "Lingua":** Language — Italiano · English

## Menu su telefono (drawer)

- **Voci:** services · work · about · contact
- **Riga in basso:** it
- **Note legali:** Freelance software engineer · Taranto, CET / © 2026 Emanuele Frascella · VAT no. 03462650734

---

Written from the approved Italian in `COPY.md`. When a line changes there, its English line changes here in the same edit.
