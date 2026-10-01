# Testi del sito — frascella.dev (italiano)

Tutti i testi che il visitatore legge o sente, nell'ordine della pagina. Modifica il testo **dopo** i due punti
o dentro le citazioni; lascia i titoletti in grassetto (servono a ritrovare il punto nel codice).

Note di formato:
- Le **parole traforate** (quelle giganti nel foglio) sono minuscole e brevi.
- Gli **aria-label** sono letti dai lettori di schermo: devono iniziare con la parola visibile, se ce n'è una.
- Il nome, la P. IVA e la città nel sito vero vengono dalle impostazioni, non sono scritti nei testi.

## Registro

- Pubblico: aziende, agenzie e startup. Tono tecnico-senior.
- Si dà del tu, senza confidenza: niente "ciao", niente punti esclamativi.
- Scrivere come lo diresti a un CTO in call: niente frasi a effetto, giochi di parole o due punti seguiti da elenchi.
- Fatti al posto degli aggettivi. Niente "soluzioni", "scalabile", "su misura", "innovativo".
- Termini tecnici sì, ma esatti e senza spiegarli.
- Ogni dato una volta sola, dove serve.
- Da non usare: il 2013 e gli inizi, la parola "backend", "l'ho scritto io" e simili, le tecnologie dei progetti proprietari.

---

## Pagina

- **Titolo della scheda del browser:** Emanuele Frascella · Software engineer freelance, Taranto
- **Meta description (risultati di Google):** Software engineer freelance a Taranto. Piattaforme web, app e integrazioni con IA e agenti per aziende, agenzie e startup, anche da remoto.

## Intestazione

- **Logo, aria-label:** frascella.dev, torna all'inizio
- **Menu:** servizi · lavori · chi sono
- **Audio, testo:** audio on / audio off
- **Audio, aria-label:** audio: fruscio del vinile
- **Lingua:** en
- **Pulsante:** scrivimi
- **Su telefono, apri / chiudi il menu:** menu / chiudi

## 1. Apertura

- **Parole traforate:** piattaforme, app e integrazioni
- **Seconda riga:** dall'architettura al rilascio
- **Testatina:** Taranto · CET · da remoto
- **Testo:**
  > Sono un software engineer freelance di Taranto e seguo progetti per aziende, agenzie e startup. Vengo dalla telemedicina, dove ho lavorato con dati sanitari e GDPR; oggi mi occupo dei motori di gioco di casinò online, dove girano soldi veri e i servizi non possono andare giù.
- **Pulsante:** Scrivimi →
- **Indicatore di scorrimento:** scorri

## 2. La scrivania (intermezzo)

Nessun testo visibile. I punti sugli oggetti non hanno testo: sono decorativi (aria-hidden) e gli oggetti
si raggiungono con i pulsanti da tastiera qui sotto.

Pulsanti da tastiera per gli oggetti (nascosti, compaiono con Tab):

- **Gruppo:** oggetti della scrivania
- **Lampada:** luce della lampada: piena / media / spenta
- **Giradischi:** giradischi: fruscio del vinile
- **Tazza:** tazza: fai ondeggiare
- **Pianta:** pianta: fai scintillare
- **Telefono:** telefono: incrina lo schermo
- **Tablet:** tablet: disegna
- **Suggerimento in modalità disegno:** Disegna sullo schermo del tablet. Premi «fatto» o Esc per tornare.

## 3. Servizi

- **Testatina:** Servizi
- **Titolo della sezione:** Cosa faccio.

### 01 — Piattaforme
- **Parola traforata:** piattaforme
- **Titolo:** Siti e piattaforme web
- **Testo:**
  > Sviluppo siti in WordPress oppure da zero, senza CMS. Per le piattaforme più complesse progetto anche la parte server, con API, database e autenticazione, e quando ha senso la divido in microservizi.

### 02 — App
- **Parola traforata:** app
- **Titolo:** App mobile e web app
- **Testo:**
  > App per iOS e Android in Flutter, web app in React o Nuxt. Le sviluppo insieme alla parte server, oppure le collego a quella che c'è già.

### 03 — Integrazioni
- **Parola traforata:** integrazioni
- **Titolo:** Integrazioni e IA
- **Testo:**
  > Collego gestionali, CRM, sistemi di pagamento e servizi esterni, in modo che i dati passino da uno all'altro senza ricopiarli a mano, con gestione degli errori e un registro di ogni scambio. Integro anche modelli linguistici e agenti nel software esistente, collegandoli ai dati dell'azienda.

## 4. Lavori

- **Parola traforata:** lavori
- **Testatina:** Lavori
- **Titolo della sezione:** Tre progetti recenti.

### 01 — seveninktattoo.it
- **Ruolo:** 01 · cliente
- **Testo:**
  > Sito per uno studio di tatuaggi di Taranto, in WordPress ed Elementor. Gestisce richieste di appuntamento, recensioni, newsletter e FAQ senza appoggiarsi a servizi esterni, quindi i dati restano sul server dello studio.
- **Tecnologie:** WordPress · Elementor
- **Stato:** online
- **Testo alternativo immagine:** La home page di seveninktattoo.it

### 02 — skeda.fit
- **Ruolo:** 02 · cofondatore
- **Testo:**
  > App per personal trainer freelance, con schede di allenamento, registrazione delle serie in palestra, chat, check-in e un profilo pubblico sulla mappa. Non è ancora uscita e la lista d'attesa è aperta.
- **Tecnologie:** _nessuna — nascondere la riga per questo progetto_
- **Stato:** in sviluppo
- **Testo alternativo immagine:** La home page di skeda.fit

### 03 — vitrine
- **Ruolo:** 03 · mio
- **Testo:**
  > Un overlay trasparente che sta dietro le icone del desktop di Windows, con i temi scritti come pagine React. Su Ubuntu usavo Conky e su Windows non c'era niente di simile. Parte con il PC e lo uso tutti i giorni.
- **Tecnologie:** C# · WPF · WebView2
- **Stato:** codice pubblico su GitHub
- **Testo alternativo immagine:** vitrine sul desktop di Windows

## 5. Chi sono

- **Parola traforata:** chi sono
- **Titolo:** Mi piace costruire le cose che uso.
- **Primo paragrafo:**
  > Molti dei miei progetti nascono da un'esigenza mia, quando uno strumento non esiste o non fa quello che mi serve. Usarli tutti i giorni mi obbliga a curare anche quello che in una demo non si vede, come i tempi di risposta, i casi limite e cosa succede quando qualcosa va storto. In questo periodo mi sto concentrando sull'IA applicata al software, in particolare su agenti e knowledge graph, e su come farli lavorare con dati reali invece che con esempi di prova.
- **Secondo paragrafo:**
  > Da freelance lavoro da solo, quindi parli direttamente con chi scrive il codice. Nel tempo libero vado in palestra e progetto tatuaggi su Procreate.
- **Dati (valore / etichetta):**
  - CET / da remoto, anche su fusi diversi
  - NDA / lo firmo prima di vedere il progetto
  - 2 giorni / lavorativi per risponderti

## 6. Contatti

- **Parola traforata:** scrivimi
- **Testo:**
  > Raccontami cosa ti serve, cosa esiste già ed entro quando. Bastano poche righe, i dettagli li vediamo insieme in una call.
- **Riga sotto il testo:** oppure emanuele@frascella.dev
- **Etichette dei campi:** Nome · Email · Azienda (facoltativo) · Messaggio
- **Suggerimento nel campo messaggio:** Es. un'app per i nostri agenti commerciali, collegata al gestionale, da lanciare entro marzo
- **Pulsante:** Invia il messaggio →
- **Messaggi del modulo (Agenda):**
  - Inviato: Messaggio ricevuto. Ti rispondo entro due giorni lavorativi.
  - Nome mancante: Scrivi il tuo nome.
  - Email non valida: L'indirizzo email non sembra valido.
  - Messaggio vuoto: Scrivi due righe su cosa ti serve.
  - Invio fallito: Il messaggio non è partito. Riprova tra qualche minuto o scrivimi a emanuele@frascella.dev.
  - _Il campo Azienda solo se Agenda permette campi extra; altrimenti si toglie._
  - _La frase sul consenso sotto il modulo è di Agenda e va scritta con la privacy, non qui._

## 7. Footer

- **Riga sotto il logo:** Software engineer freelance · Taranto, CET
- **Note legali:** © 2026 Emanuele Frascella · P. IVA 03462650734
- **Colonna "Indice":** servizi · lavori · chi sono · scrivimi
- **Colonna "Altrove":** github · linkedin
- **Colonna "Legale":** privacy · cookie
- **Colonna "Lingua":** Italiano · English

## Menu su telefono (drawer)

- **Voci:** servizi · lavori · chi sono · scrivimi
- **Riga in basso:** audio on | en
- **Note legali:** Software engineer freelance · Taranto, CET / © 2026 Emanuele Frascella · P. IVA 03462650734

---

La versione inglese (`/en/`) si scrive a parte, partendo da questa una volta approvata.