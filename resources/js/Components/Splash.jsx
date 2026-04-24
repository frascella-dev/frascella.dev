import { useEffect, useRef, useState } from 'react';

const ASCII_LOGO = [
    '          ------:                                    ',
    '          -------------                              ',
    '          -------------------                        ',
    '         :-------------------     -:                 ',
    '        -------    ---------:    ------              ',
    '        ------        ------:    --------:           ',
    '       :------       ------:    -----------          ',
    '       -------       ------:   --------------        ',
    '      :------       :-----:    :-----:--------       ',
    '      -------        :----:   -------  :-------      ',
    '     =------                  -------   =------:     ',
    '     :----------:-:           ------     :------     ',
    '     --------------------    -------      ------     ',
    '     -------------------     ------                  ',
    '    -------    :-------:    --------:---             ',
    '     ------          ::     ------------------       ',
    '     ------                :--------------------     ',
    '     -------               -----:   :----------:     ',
    '     :------:             -------         -----:     ',
    '      :-------            -------                    ',
    '       -------:          :-----:                     ',
    '        :--------        ------                      ',
    '          :---------    :-----:                      ',
    '           ::------     :-----                       ',
    '              ----:    -------                       ',
    '                 -     ------         -:             ',
    '                       ------        ------          ',
    '                                    -------          ',
    '                                    ------:          ',
];

const SYSINFO = [
    ['user', 'emanuele@frascella.dev'],
    ['os', 'frascella.dev 2026.04 LTS x86_64'],
    ['kernel', '6.8.0-portfolio'],
    ['shell', 'zsh 5.9'],
    ['term', 'alacritty'],
    ['role', 'backend engineer'],
    ['based', 'taranto, italy'],
    ['stack', 'php · node · python · aws'],
    ['uptime', '5 years, 2 months'],
    ['theme', 'paper / ink / acid-lime'],
];

function Block({ b, sysinfo }) {
    if (b.k === 'boot') return <div className="ef-l ef-l-boot"><span>{b.t}</span></div>;
    if (b.k === 'blank') return <div className="ef-l ef-l-blank">&nbsp;</div>;
    if (b.k === 'welcome') return <div className="ef-l ef-l-welcome"><span>{b.t}</span></div>;
    if (b.k === 'welcome-sub') return <div className="ef-l ef-l-welcome-sub"><span>{b.t}</span></div>;
    if (b.k === 'system') return <div className="ef-l ef-l-sys"><span>{b.t}</span></div>;
    if (b.k === 'ls') {
        return (
            <div className="ef-l ef-l-ls">
                {b.items.map((it, i) => (
                    <span key={i} className={it.endsWith('/') ? 'ef-ls-dir' : it.startsWith('.') ? 'ef-ls-hidden' : 'ef-ls-file'}>
                        {it}
                    </span>
                ))}
            </div>
        );
    }
    if (b.k === 'prompt-static') {
        return (
            <div className="ef-l ef-l-prompt">
                <span className="ef-p-user">{b.user}</span>
                <span className="ef-p-at">@</span>
                <span className="ef-p-host">{b.host}</span>
                <span className="ef-p-colon">:</span>
                <span className="ef-p-path">{b.path}</span>
                <span className="ef-p-dollar">$ </span>
                <span className="ef-p-cmd">{b.cmd}</span>
            </div>
        );
    }
    if (b.k === 'neofetch') {
        return (
            <div className="ef-neofetch">
                <pre className="ef-neo-logo">{ASCII_LOGO.join('\n')}</pre>
                <div className="ef-neo-info">
                    <div className="ef-neo-title">
                        <span className="ef-p-user">emanuele</span>
                        <span className="ef-p-at">@</span>
                        <span className="ef-p-host">frascella.dev</span>
                    </div>
                    <div className="ef-neo-rule" />
                    {sysinfo.map(([k, v]) => (
                        <div className="ef-neo-row" key={k}>
                            <span className="ef-neo-k">{k}</span>
                            <span className="ef-neo-v">{v}</span>
                        </div>
                    ))}
                    <div className="ef-neo-palette" aria-hidden>
                        <span style={{ background: '#0A0B0A' }} />
                        <span style={{ background: '#7A7566' }} />
                        <span style={{ background: '#E9E6DC' }} />
                        <span style={{ background: '#C7F651' }} />
                        <span style={{ background: '#FF8AD8' }} />
                        <span style={{ background: '#8FD4FF' }} />
                        <span style={{ background: '#FFB86B' }} />
                        <span style={{ background: '#EEEAE0' }} />
                    </div>
                </div>
            </div>
        );
    }
    return null;
}

export default function Splash({ onDone }) {
    const [rendered, setRendered] = useState([]);
    const [closing, setClosing] = useState(false);
    const [typed, setTyped] = useState({ id: null, text: '', done: false, user: '', host: '', path: '' });
    const [output, setOutput] = useState([]);
    const scrollerRef = useRef(null);

    useEffect(() => {
        if (scrollerRef.current) {
            scrollerRef.current.scrollTop = scrollerRef.current.scrollHeight;
        }
    }, [rendered, typed, output]);

    useEffect(() => {
        try {
            if (sessionStorage.getItem('ef-splash-seen') === '1') {
                setClosing(true);
                setTimeout(() => onDone?.(), 50);
                return;
            }
        } catch {}

        let cancelled = false;
        const timeouts = [];
        const wait = (ms) => new Promise((r) => timeouts.push(setTimeout(r, ms)));
        const push = (block) => setRendered((prev) => [...prev, block]);

        const typeCommand = async (id, user, host, path, cmd) => {
            setTyped({ id, text: '', done: false, user, host, path });
            for (let i = 0; i < cmd.length; i++) {
                if (cancelled) break;
                setTyped((t) => ({ ...t, text: cmd.slice(0, i + 1) }));
                await wait(40 + Math.random() * 32);
            }
            await wait(120);
            setTyped((t) => ({ ...t, done: true }));
            push({ k: 'prompt-static', user, host, path, cmd });
            setTyped({ id: null, text: '', done: false, user: '', host: '', path: '' });
            await wait(160);
        };

        const run = async () => {
            push({ k: 'boot', t: '[    0.000000] Booting frascella.dev 2026.04 (tty1)' });
            await wait(120);
            push({ k: 'boot', t: '[    0.214881] Loaded modules: node/22, php/8.3, aws-cli, docker' });
            await wait(140);
            push({ k: 'boot', t: '[    0.482110] Systemd services ready. Welcome.' });
            await wait(240);
            push({ k: 'blank' });

            push({ k: 'welcome', t: 'Welcome to frascella.dev 2026.04 LTS (GNU/Linux 6.8.0-portfolio x86_64)' });
            push({ k: 'welcome-sub', t: ' * Documentation:  https://github.com/manuto276' });
            push({ k: 'welcome-sub', t: ' * Support:        https://linkedin.com/in/efrascella256' });
            push({ k: 'blank' });
            await wait(240);

            push({ k: 'neofetch' });
            await wait(900);

            push({ k: 'blank' });
            push({ k: 'system', t: 'Last login: Thu Apr 16 09:42:18 2026 on tty1' });
            await wait(220);
            push({ k: 'blank' });

            await typeCommand('cd', 'emanuele', 'frascella.dev', '~', 'cd portfolio && ls');
            push({ k: 'ls', items: ['public/', 'src/', 'package.json', 'tsconfig.json', 'README.md', '.env'] });
            await wait(280);
            push({ k: 'blank' });

            await typeCommand('dev', 'emanuele', 'frascella.dev', '~/portfolio', 'npm run dev');

            const out = [
                { k: 'out', t: '' },
                { k: 'out', t: '> portfolio@2026.4.0 dev' },
                { k: 'out', t: '> next dev --turbo --port 2026' },
                { k: 'out', t: '' },
                { k: 'out-dim', t: '  ▲ Next.js 15.1.0  (turbo)' },
                { k: 'out-dim', t: '  - Local:        http://localhost:2026' },
                { k: 'out-dim', t: '  - Network:      http://10.0.0.42:2026' },
                { k: 'out-dim', t: '  - Environments: .env.local' },
                { k: 'out', t: '' },
                { k: 'out-ok', t: ' ✓ Starting...' },
                { k: 'out-ok', t: ' ✓ Ready in 842ms' },
                { k: 'out', t: '' },
                { k: 'out-dim', t: ' ○ Compiling / ...' },
                { k: 'out-ok', t: ' ✓ Compiled / in 312ms' },
                { k: 'out', t: '' },
                { k: 'out-launch', t: '→ Opening http://localhost:2026 …' },
            ];
            for (const line of out) {
                if (cancelled) break;
                setOutput((prev) => [...prev, line]);
                await wait(line.k === 'out-ok' ? 160 : line.k === 'out-launch' ? 240 : 70);
            }

            await wait(320);
            if (!cancelled) {
                setClosing(true);
                await wait(700);
                try { sessionStorage.setItem('ef-splash-seen', '1'); } catch {}
                onDone?.();
            }
        };
        run();

        return () => {
            cancelled = true;
            timeouts.forEach(clearTimeout);
        };
    }, [onDone]);

    return (
        <div className={`ef-splash ${closing ? 'is-closing' : ''}`}>
            <div className="ef-splash-body" ref={scrollerRef}>
                <div className="ef-splash-stream">
                    {rendered.map((b, i) => <Block key={i} b={b} sysinfo={SYSINFO} />)}

                    {typed.id && (
                        <div className="ef-l ef-l-prompt">
                            <span className="ef-p-user">{typed.user}</span>
                            <span className="ef-p-at">@</span>
                            <span className="ef-p-host">{typed.host}</span>
                            <span className="ef-p-colon">:</span>
                            <span className="ef-p-path">{typed.path}</span>
                            <span className="ef-p-dollar">$ </span>
                            <span className="ef-p-cmd">{typed.text}</span>
                            {!typed.done && <span className="ef-caret" />}
                        </div>
                    )}

                    {output.map((l, i) => (
                        <div key={i} className={`ef-l ef-l-${l.k}`}>
                            <span className="ef-o">{l.t}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
