# Inventario completo de estilos

Fuente: [client/src/styles.css](../client/src/styles.css). Cada fila registra una regla propia y sus declaraciones exactas. Reglas repetidas en distintas condiciones son overrides de cascade, no duplicados de funcionalidad. Los componentes y la finalidad de cada grupo visual se explican en [Frontend](frontend.md).

## Reglas externas, responsive y animaciones

| Tipo | Parámetros | Línea |
| --- | --- | --- |
| <code>@import</code> | <code>url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;450;500;550;600;650;700&amp;family=Manrope:wght@400;500;600;650;700;750;800&amp;display=swap')</code> | [L1](../client/src/styles.css#L1) |
| <code>@keyframes</code> | <code>spin</code> | [L4](../client/src/styles.css#L4) |
| <code>@media</code> | <code>(min-width:1500px)</code> | [L19](../client/src/styles.css#L19) |
| <code>@media</code> | <code>(max-width:1150px)</code> | [L20](../client/src/styles.css#L20) |
| <code>@media</code> | <code>(max-width:960px)</code> | [L21](../client/src/styles.css#L21) |
| <code>@media</code> | <code>(max-width:720px)</code> | [L22](../client/src/styles.css#L22) |
| <code>@media</code> | <code>(max-width:380px)</code> | [L23](../client/src/styles.css#L23) |
| <code>@media</code> | <code>(prefers-reduced-motion:reduce)</code> | [L25](../client/src/styles.css#L25) |

## Selectores y declaraciones

| Selector | Contexto | Declaraciones |
| --- | --- | --- |
| [<code>:root</code>](../client/src/styles.css#L3) | <code>General</code> | <code>font-family: 'DM Sans',sans-serif; color: #233a3b; background: #f6f8f7; font-synthesis: none; text-rendering: optimizeLegibility; -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; font-weight: 400; --ink: #173537; --muted: #7d8d8b; --teal: #17856d; --line: #e7ece9; --navy: #112d32</code> |
| [<code>&#42;</code>](../client/src/styles.css#L4) | <code>General</code> | <code>box-sizing: border-box</code> |
| [<code>body</code>](../client/src/styles.css#L4) | <code>General</code> | <code>margin: 0</code> |
| [<code>button,input,select</code>](../client/src/styles.css#L4) | <code>General</code> | <code>font: inherit</code> |
| [<code>button</code>](../client/src/styles.css#L4) | <code>General</code> | <code>cursor: pointer</code> |
| [<code>button:disabled</code>](../client/src/styles.css#L4) | <code>General</code> | <code>cursor: wait; opacity: .6</code> |
| [<code>button,a,input,select</code>](../client/src/styles.css#L4) | <code>General</code> | <code>-webkit-tap-highlight-color: transparent</code> |
| [<code>button</code>](../client/src/styles.css#L4) | <code>General</code> | <code>color: inherit</code> |
| [<code>button:focus-visible,input:focus-visible,select:focus-visible</code>](../client/src/styles.css#L4) | <code>General</code> | <code>outline: 3px solid #56bba7; outline-offset: 3px</code> |
| [<code>input,select</code>](../client/src/styles.css#L4) | <code>General</code> | <code>min-width: 0</code> |
| [<code>h1,h2,h3,p</code>](../client/src/styles.css#L4) | <code>General</code> | <code>margin: 0</code> |
| [<code>h1,h2,h3</code>](../client/src/styles.css#L4) | <code>General</code> | <code>font-family: 'Manrope',sans-serif</code> |
| [<code>svg</code>](../client/src/styles.css#L4) | <code>General</code> | <code>flex-shrink: 0</code> |
| [<code>button</code>](../client/src/styles.css#L4) | <code>General</code> | <code>transition: background .16s,box-shadow .16s,transform .16s</code> |
| [<code>a</code>](../client/src/styles.css#L4) | <code>General</code> | <code>color: var(--teal)</code> |
| [<code>.muted</code>](../client/src/styles.css#L4) | <code>General</code> | <code>color: var(--muted)</code> |
| [<code>.green</code>](../client/src/styles.css#L4) | <code>General</code> | <code>color: var(--teal)</code> |
| [<code>.eyebrow</code>](../client/src/styles.css#L4) | <code>General</code> | <code>font-size: 10px; font-weight: 700; letter-spacing: 1.5px; color: #79928b</code> |
| [<code>.brand</code>](../client/src/styles.css#L4) | <code>General</code> | <code>display: flex; align-items: center; gap: 10px; font-family: 'Manrope',sans-serif; font-weight: 800; letter-spacing: -1.2px; font-size: 27px; color: #153b39</code> |
| [<code>.brand-light</code>](../client/src/styles.css#L4) | <code>General</code> | <code>color: white</code> |
| [<code>.brand-dot</code>](../client/src/styles.css#L4) | <code>General</code> | <code>color: #6edeb7</code> |
| [<code>.brand-mark</code>](../client/src/styles.css#L4) | <code>General</code> | <code>display: flex; align-items: flex-end; justify-content: center; gap: 3px; width: 30px; height: 30px; padding-bottom: 4px; transform: rotate(-3deg)</code> |
| [<code>.brand-mark i</code>](../client/src/styles.css#L4) | <code>General</code> | <code>display: block; width: 5px; background: #67d3aa; border-radius: 2px</code> |
| [<code>.brand-mark i:nth-child(1)</code>](../client/src/styles.css#L4) | <code>General</code> | <code>height: 12px</code> |
| [<code>.brand-mark i:nth-child(2)</code>](../client/src/styles.css#L4) | <code>General</code> | <code>height: 24px</code> |
| [<code>.brand-mark i:nth-child(3)</code>](../client/src/styles.css#L4) | <code>General</code> | <code>height: 18px</code> |
| [<code>.pill</code>](../client/src/styles.css#L4) | <code>General</code> | <code>display: inline-flex; align-items: center; gap: 5px; white-space: nowrap; padding: 5px 9px; border-radius: 5px; font-size: 10px; font-weight: 650; line-height: 1.3; letter-spacing: .05px</code> |
| [<code>.pill.soft</code>](../client/src/styles.css#L4) | <code>General</code> | <code>color: #2b7566; background: #edf5f0</code> |
| [<code>.pill.demo</code>](../client/src/styles.css#L4) | <code>General</code> | <code>background: #fff5d9; color: #917328; letter-spacing: .6px</code> |
| [<code>.pill.active</code>](../client/src/styles.css#L4) | <code>General</code> | <code>background: #eaf7ef; color: #25835c</code> |
| [<code>.pill.neutral</code>](../client/src/styles.css#L4) | <code>General</code> | <code>background: #f0f2f1; color: #748380</code> |
| [<code>.pill.purple</code>](../client/src/styles.css#L4) | <code>General</code> | <code>background: #f0edfa; color: #7461a6</code> |
| [<code>.live-dot</code>](../client/src/styles.css#L4) | <code>General</code> | <code>display: inline-block; width: 5px; height: 5px; border-radius: 50%; background: currentColor; flex-shrink: 0</code> |
| [<code>.button</code>](../client/src/styles.css#L4) | <code>General</code> | <code>border: 1px solid transparent; border-radius: 7px; padding: 11px 17px; display: inline-flex; align-items: center; justify-content: center; gap: 8px; font-size: 12px; font-weight: 600; min-height: 39px; line-height: 1.3</code> |
| [<code>.primary</code>](../client/src/styles.css#L4) | <code>General</code> | <code>background: #17856d; color: #fff; box-shadow: 0 2px 3px #164a3310</code> |
| [<code>.primary:hover</code>](../client/src/styles.css#L4) | <code>General</code> | <code>background: #126e5b; box-shadow: 0 3px 10px #164a3320</code> |
| [<code>.secondary</code>](../client/src/styles.css#L4) | <code>General</code> | <code>background: white; color: #45635b; border-color: #dee7e1</code> |
| [<code>.secondary:hover</code>](../client/src/styles.css#L4) | <code>General</code> | <code>background: #f1f6f3</code> |
| [<code>.small-icon</code>](../client/src/styles.css#L4) | <code>General</code> | <code>background: #eef5f1; color: #25745f; padding: 10px 12px</code> |
| [<code>.small-icon:hover</code>](../client/src/styles.css#L4) | <code>General</code> | <code>background: #e5f0e9</code> |
| [<code>.text-button</code>](../client/src/styles.css#L4) | <code>General</code> | <code>border: 0; background: none; color: #248169; display: inline-flex; align-items: center; justify-content: center; gap: 5px; font-size: 11px; font-weight: 600; padding: 6px 0</code> |
| [<code>.text-button:hover</code>](../client/src/styles.css#L4) | <code>General</code> | <code>color: #114c3d</code> |
| [<code>.icon-button</code>](../client/src/styles.css#L4) | <code>General</code> | <code>display: flex; justify-content: center; align-items: center; padding: 7px; border: 0; border-radius: 6px; background: none; color: #738985</code> |
| [<code>.icon-button:hover</code>](../client/src/styles.css#L4) | <code>General</code> | <code>background: #eaf1ed</code> |
| [<code>.provider-mini</code>](../client/src/styles.css#L4) | <code>General</code> | <code>display: inline-flex; justify-content: center; align-items: center; width: 19px; height: 19px; flex-shrink: 0; background: #85ad46; color: white; border-radius: 4px; font-size: 12px; font-weight: 700; line-height: 1</code> |
| [<code>.shopify-mini</code>](../client/src/styles.css#L4) | <code>General</code> | <code>background: #81a744</code> |
| [<code>.clarity-mini</code>](../client/src/styles.css#L4) | <code>General</code> | <code>background: #7770da</code> |
| [<code>.alert</code>](../client/src/styles.css#L4) | <code>General</code> | <code>display: flex; align-items: center; gap: 10px; border-radius: 8px; font-size: 12px; padding: 13px 16px; margin-bottom: 18px; line-height: 1.6</code> |
| [<code>.alert.error</code>](../client/src/styles.css#L4) | <code>General</code> | <code>background: #fff0ed; border: 1px solid #f5ddd6; color: #b35b47</code> |
| [<code>.alert.error .text-button</code>](../client/src/styles.css#L4) | <code>General</code> | <code>margin-left: auto</code> |
| [<code>.avatar</code>](../client/src/styles.css#L4) | <code>General</code> | <code>display: flex; align-items: center; justify-content: center; width: 34px; height: 34px; flex-shrink: 0; border-radius: 10px; background: #e8f0e7; color: #6b895d; font-weight: 600; font-size: 12px</code> |
| [<code>.app-loading</code>](../client/src/styles.css#L4) | <code>General</code> | <code>min-height: 100vh; display: flex; flex-direction: column; gap: 30px; align-items: center; justify-content: center; padding: 30px</code> |
| [<code>.loading</code>](../client/src/styles.css#L4) | <code>General</code> | <code>display: flex; align-items: center; justify-content: center; gap: 12px; min-height: 230px; font-size: 13px; color: #738b81</code> |
| [<code>.loader</code>](../client/src/styles.css#L4) | <code>General</code> | <code>width: 20px; height: 20px; border: 2px solid #dcece3; border-top-color: var(--teal); border-radius: 50%; animation: spin .7s linear infinite</code> |
| [<code>.spin</code>](../client/src/styles.css#L4) | <code>General</code> | <code>animation: spin 1s linear infinite</code> |
| [<code>to</code>](../client/src/styles.css#L4) | <code>@keyframes spin</code> | <code>transform: rotate(360deg)</code> |
| [<code>.login-page</code>](../client/src/styles.css#L7) | <code>General</code> | <code>min-height: 100vh; display: grid; grid-template-columns: 46% 54%; background: #fff</code> |
| [<code>.login-story</code>](../client/src/styles.css#L7) | <code>General</code> | <code>min-height: 100vh; background: #112e32; color: white; padding: 45px 10%; display: flex; flex-direction: column; position: relative; overflow: hidden</code> |
| [<code>.login-story:before</code>](../client/src/styles.css#L7) | <code>General</code> | <code>content: ''; position: absolute; right: -170px; bottom: -170px; border: 1px solid #72bc9220; border-radius: 50%; width: 600px; height: 600px; box-shadow: 0 0 0 100px #72bc9205,0 0 0 200px #72bc9203; pointer-events: none</code> |
| [<code>.login-story .brand</code>](../client/src/styles.css#L7) | <code>General</code> | <code>z-index: 1</code> |
| [<code>.login-story-body</code>](../client/src/styles.css#L7) | <code>General</code> | <code>padding-top: 78px; position: relative</code> |
| [<code>.light-eyebrow</code>](../client/src/styles.css#L7) | <code>General</code> | <code>color: #81bfa8; display: flex; align-items: center; gap: 7px; letter-spacing: 1.8px; font-size: 9px</code> |
| [<code>.light-eyebrow .live-dot</code>](../client/src/styles.css#L7) | <code>General</code> | <code>width: 6px; height: 6px</code> |
| [<code>.login-story h1</code>](../client/src/styles.css#L7) | <code>General</code> | <code>font-size: clamp(40px,4vw,64px); line-height: 1.12; letter-spacing: -2.5px; font-weight: 650; margin-top: 23px</code> |
| [<code>.login-story h1 span</code>](../client/src/styles.css#L7) | <code>General</code> | <code>color: #88d8b9</code> |
| [<code>.login-story-body&gt;p</code>](../client/src/styles.css#L7) | <code>General</code> | <code>font-size: 13px; line-height: 1.9; color: #a6beb9; margin-top: 24px</code> |
| [<code>.login-providers</code>](../client/src/styles.css#L7) | <code>General</code> | <code>display: flex; align-items: center; gap: 18px; margin-top: 26px; flex-wrap: wrap</code> |
| [<code>.login-providers&gt;span</code>](../client/src/styles.css#L7) | <code>General</code> | <code>display: flex; align-items: center; gap: 7px; font-size: 10px; color: #c4d2ce</code> |
| [<code>.login-providers .provider-mini</code>](../client/src/styles.css#L7) | <code>General</code> | <code>width: 18px; height: 18px; font-size: 11px</code> |
| [<code>.story-visual</code>](../client/src/styles.css#L7) | <code>General</code> | <code>margin-top: 50px; max-width: 370px; background: linear-gradient(140deg,#23453f90,#18383980); border: 1px solid #72bc9229; border-radius: 12px; padding: 22px 24px</code> |
| [<code>.story-visual-label</code>](../client/src/styles.css#L7) | <code>General</code> | <code>display: flex; align-items: center; justify-content: space-between; font-size: 9px; letter-spacing: 1.4px; color: #a9c7b6</code> |
| [<code>.story-visual-label svg</code>](../client/src/styles.css#L7) | <code>General</code> | <code>color: #8cd7b5; width: 18px</code> |
| [<code>.story-bars</code>](../client/src/styles.css#L7) | <code>General</code> | <code>display: flex; align-items: flex-end; gap: 10px; height: 75px; margin-top: 28px</code> |
| [<code>.story-bars&gt;span</code>](../client/src/styles.css#L7) | <code>General</code> | <code>flex: 1; max-width: 25px; border-radius: 3px 3px 0 0; background: linear-gradient(#80cca6,#4c8c7360)</code> |
| [<code>.story-visual-footer</code>](../client/src/styles.css#L7) | <code>General</code> | <code>display: flex; align-items: center; justify-content: space-between; margin-top: 20px; padding-top: 15px; border-top: 1px solid #83bb9c20; color: #b3cbbb; font-size: 10px</code> |
| [<code>.login-story-footer</code>](../client/src/styles.css#L7) | <code>General</code> | <code>display: flex; align-items: center; gap: 7px; color: #7e9e93; font-size: 10px; margin-top: auto; padding-top: 45px; position: relative</code> |
| [<code>.login-main</code>](../client/src/styles.css#L7) | <code>General</code> | <code>display: flex; align-items: center; justify-content: center; padding: 45px</code> |
| [<code>.login-form-wrap</code>](../client/src/styles.css#L7) | <code>General</code> | <code>width: 100%; max-width: 392px</code> |
| [<code>.login-form-wrap&gt;.pill</code>](../client/src/styles.css#L7) | <code>General</code> | <code>font-size: 8px; letter-spacing: 1px; padding: 7px 9px</code> |
| [<code>.login-form-wrap h2</code>](../client/src/styles.css#L7) | <code>General</code> | <code>font-size: 32px; letter-spacing: -1px; font-weight: 700; margin-top: 21px</code> |
| [<code>.login-form-wrap&gt;.muted</code>](../client/src/styles.css#L7) | <code>General</code> | <code>font-size: 13px; margin-top: 9px</code> |
| [<code>.login-form</code>](../client/src/styles.css#L7) | <code>General</code> | <code>margin-top: 32px</code> |
| [<code>.login-form label,.stack-form label</code>](../client/src/styles.css#L7) | <code>General</code> | <code>display: flex; flex-direction: column; font-size: 11px; font-weight: 600; gap: 8px; margin-bottom: 18px; color: #49625a</code> |
| [<code>.input-icon</code>](../client/src/styles.css#L7) | <code>General</code> | <code>position: relative; display: flex; align-items: center</code> |
| [<code>.input-icon&gt;svg</code>](../client/src/styles.css#L7) | <code>General</code> | <code>position: absolute; left: 14px; color: #81998f</code> |
| [<code>.input-icon input</code>](../client/src/styles.css#L7) | <code>General</code> | <code>padding-left: 42px</code> |
| [<code>input,select</code>](../client/src/styles.css#L7) | <code>General</code> | <code>border: 1px solid #dfe6e0; border-radius: 7px; background: white; padding: 13px 14px; color: #314e44; font-size: 12px; min-height: 43px; width: 100%; transition: border .15s</code> |
| [<code>input::placeholder</code>](../client/src/styles.css#L7) | <code>General</code> | <code>color: #a3afa9</code> |
| [<code>input:hover,select:hover</code>](../client/src/styles.css#L7) | <code>General</code> | <code>border-color: #b6cbbd</code> |
| [<code>.login-submit</code>](../client/src/styles.css#L7) | <code>General</code> | <code>width: 100%; justify-content: space-between; padding: 14px 17px; margin-top: 5px</code> |
| [<code>.demo-login</code>](../client/src/styles.css#L7) | <code>General</code> | <code>border-top: 1px solid var(--line); margin-top: 32px; padding-top: 23px</code> |
| [<code>.demo-login-title</code>](../client/src/styles.css#L7) | <code>General</code> | <code>display: flex; align-items: center; gap: 9px; font-size: 10px; color: #809087</code> |
| [<code>.demo-login-title .pill</code>](../client/src/styles.css#L7) | <code>General</code> | <code>font-size: 8px</code> |
| [<code>.demo-users</code>](../client/src/styles.css#L7) | <code>General</code> | <code>display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 14px</code> |
| [<code>.demo-users button</code>](../client/src/styles.css#L7) | <code>General</code> | <code>position: relative; text-align: left; background: #fafbf9; border: 1px solid #e8ede7; border-radius: 7px; padding: 12px 11px; display: flex; flex-direction: column; gap: 5px</code> |
| [<code>.demo-users button:hover,.demo-users button.selected</code>](../client/src/styles.css#L7) | <code>General</code> | <code>border-color: #95c4aa; background: #f0f7ef</code> |
| [<code>.demo-users button&gt;span</code>](../client/src/styles.css#L7) | <code>General</code> | <code>font-size: 11px; font-weight: 600</code> |
| [<code>.demo-users button small</code>](../client/src/styles.css#L7) | <code>General</code> | <code>font-size: 9px; color: #8c9a8f</code> |
| [<code>.demo-users button svg</code>](../client/src/styles.css#L7) | <code>General</code> | <code>position: absolute; right: 10px; top: 12px; color: #99afa0; width: 13px</code> |
| [<code>.demo-login&gt;p</code>](../client/src/styles.css#L7) | <code>General</code> | <code>margin-top: 13px; font-size: 9px; color: #98a49a; line-height: 1.7</code> |
| [<code>.login-note</code>](../client/src/styles.css#L7) | <code>General</code> | <code>display: flex; align-items: center; justify-content: center; gap: 6px; font-size: 9px; color: #8b9c92; margin-top: 28px</code> |
| [<code>.workspace</code>](../client/src/styles.css#L10) | <code>General</code> | <code>display: flex; min-height: 100vh</code> |
| [<code>.sidebar</code>](../client/src/styles.css#L10) | <code>General</code> | <code>position: fixed; z-index: 30; left: 0; top: 0; width: 234px; height: 100dvh; background: var(--navy); color: #c1d2cd; display: flex; flex-direction: column; padding: 30px 19px 0</code> |
| [<code>.sidebar&gt;.brand</code>](../client/src/styles.css#L10) | <code>General</code> | <code>margin-left: 9px; font-size: 25px</code> |
| [<code>.sidebar&gt;.brand .brand-mark</code>](../client/src/styles.css#L10) | <code>General</code> | <code>width: 26px; height: 27px</code> |
| [<code>.workspace-tag</code>](../client/src/styles.css#L10) | <code>General</code> | <code>display: flex; align-items: center; gap: 10px; margin: 36px 8px 31px</code> |
| [<code>.workspace-symbol</code>](../client/src/styles.css#L10) | <code>General</code> | <code>display: flex; align-items: center; justify-content: center; width: 32px; height: 32px; border: 1px solid #63867855; border-radius: 8px; color: #c0d0c2; font-family: 'Manrope',sans-serif; font-size: 13px; background: #23423f</code> |
| [<code>.workspace-tag strong</code>](../client/src/styles.css#L10) | <code>General</code> | <code>font-size: 11px; font-weight: 550; color: #d5e4dd; display: block</code> |
| [<code>.workspace-tag small</code>](../client/src/styles.css#L10) | <code>General</code> | <code>display: block; font-size: 9px; color: #72928b; margin-top: 4px</code> |
| [<code>.nav-label</code>](../client/src/styles.css#L10) | <code>General</code> | <code>font-size: 8px; letter-spacing: 1.3px; font-weight: 600; color: #64877d; margin: 0 12px 12px</code> |
| [<code>.sidebar nav</code>](../client/src/styles.css#L10) | <code>General</code> | <code>display: flex; flex-direction: column; gap: 4px</code> |
| [<code>.nav-item</code>](../client/src/styles.css#L10) | <code>General</code> | <code>border: 0; display: flex; align-items: center; gap: 11px; padding: 13px 13px; background: none; border-radius: 7px; color: #8caba2; text-align: left; font-size: 12px; width: 100%; font-weight: 450</code> |
| [<code>.nav-item:hover</code>](../client/src/styles.css#L10) | <code>General</code> | <code>color: #d5e7de; background: #21403d</code> |
| [<code>.nav-item.active</code>](../client/src/styles.css#L10) | <code>General</code> | <code>background: #244b44; color: #9ee2bc</code> |
| [<code>.nav-item.active&gt;svg</code>](../client/src/styles.css#L10) | <code>General</code> | <code>color: #a5e4c2</code> |
| [<code>.nav-dot</code>](../client/src/styles.css#L10) | <code>General</code> | <code>width: 5px; height: 5px; border-radius: 50%; background: #8dd7af; margin-left: auto</code> |
| [<code>.sidebar-insight</code>](../client/src/styles.css#L10) | <code>General</code> | <code>border: 1px solid #426e593b; border-radius: 10px; margin: 49px 8px 20px; padding: 19px; background: linear-gradient(150deg,#20433b,#1b3935)</code> |
| [<code>.sidebar-insight-icon</code>](../client/src/styles.css#L10) | <code>General</code> | <code>display: block; color: #91c8a0; margin-bottom: 12px</code> |
| [<code>.sidebar-insight strong</code>](../client/src/styles.css#L10) | <code>General</code> | <code>display: block; font-family: 'Manrope',sans-serif; font-size: 14px; font-weight: 550; line-height: 1.6; color: #cce4d3</code> |
| [<code>.sidebar-insight p</code>](../client/src/styles.css#L10) | <code>General</code> | <code>font-size: 9px; line-height: 1.8; color: #88a791; margin-top: 8px</code> |
| [<code>.sidebar-insight&gt;div</code>](../client/src/styles.css#L10) | <code>General</code> | <code>display: flex; gap: 5px; margin-top: 17px</code> |
| [<code>.sidebar-insight&gt;div&gt;span</code>](../client/src/styles.css#L10) | <code>General</code> | <code>display: inline-flex; align-items: center; justify-content: center; width: 21px; height: 21px; border-radius: 5px; color: white; font-size: 11px; font-weight: 700</code> |
| [<code>.sidebar-bottom</code>](../client/src/styles.css#L10) | <code>General</code> | <code>margin-top: auto</code> |
| [<code>.sidebar-private</code>](../client/src/styles.css#L10) | <code>General</code> | <code>display: flex; align-items: center; gap: 7px; color: #648779; font-size: 9px; padding: 18px 12px</code> |
| [<code>.user-profile</code>](../client/src/styles.css#L10) | <code>General</code> | <code>display: flex; align-items: center; gap: 9px; padding: 17px 6px 20px; width: 100%; border: 0; border-top: 1px solid #4c6a5c3b; background: none; text-align: left; color: #bfd4c6</code> |
| [<code>.user-profile&gt;.avatar</code>](../client/src/styles.css#L10) | <code>General</code> | <code>background: #315446; color: #b7d3b8; width: 31px; height: 31px; font-size: 10px</code> |
| [<code>.user-profile&gt;div</code>](../client/src/styles.css#L10) | <code>General</code> | <code>flex: 1; min-width: 0</code> |
| [<code>.user-profile strong</code>](../client/src/styles.css#L10) | <code>General</code> | <code>display: block; font-size: 10px; font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap</code> |
| [<code>.user-profile small</code>](../client/src/styles.css#L10) | <code>General</code> | <code>display: block; color: #809f8d; font-size: 9px; margin-top: 4px</code> |
| [<code>.user-profile&gt;svg</code>](../client/src/styles.css#L10) | <code>General</code> | <code>color: #749180</code> |
| [<code>.user-profile:hover&gt;svg</code>](../client/src/styles.css#L10) | <code>General</code> | <code>color: #c2ddcb</code> |
| [<code>.workspace-body</code>](../client/src/styles.css#L10) | <code>General</code> | <code>margin-left: 234px; width: calc(100% - 234px); min-width: 0</code> |
| [<code>.topbar</code>](../client/src/styles.css#L10) | <code>General</code> | <code>height: 69px; border-bottom: 1px solid var(--line); background: #fff; display: flex; align-items: center; justify-content: space-between; padding: 0 36px</code> |
| [<code>.topbar-left,.topbar-right</code>](../client/src/styles.css#L10) | <code>General</code> | <code>display: flex; align-items: center; gap: 14px</code> |
| [<code>.breadcrumb</code>](../client/src/styles.css#L10) | <code>General</code> | <code>display: flex; align-items: center; gap: 10px; font-size: 10px; color: #97a69e</code> |
| [<code>.breadcrumb strong</code>](../client/src/styles.css#L10) | <code>General</code> | <code>font-weight: 500; color: #5b7165</code> |
| [<code>.breadcrumb svg</code>](../client/src/styles.css#L10) | <code>General</code> | <code>color: #bbc5bd</code> |
| [<code>.role-chip</code>](../client/src/styles.css#L10) | <code>General</code> | <code>font-size: 9px; color: #6b8574; display: inline-flex; align-items: center; gap: 5px</code> |
| [<code>.topbar-avatar</code>](../client/src/styles.css#L10) | <code>General</code> | <code>width: 30px; height: 30px; font-size: 9px; border-radius: 50%</code> |
| [<code>.mobile-menu</code>](../client/src/styles.css#L10) | <code>General</code> | <code>display: none</code> |
| [<code>.main-content</code>](../client/src/styles.css#L10) | <code>General</code> | <code>padding: 24px 36px 0; max-width: 1500px; margin: 0 auto</code> |
| [<code>.demo-banner</code>](../client/src/styles.css#L10) | <code>General</code> | <code>display: flex; align-items: center; gap: 9px; padding: 10px 13px; background: #fffaf0; border: 1px solid #f0e7d3; border-radius: 6px; color: #9c895a; font-size: 10px; margin-bottom: 28px</code> |
| [<code>.demo-banner&gt;.pill</code>](../client/src/styles.css#L10) | <code>General</code> | <code>font-size: 8px; padding: 3px 7px</code> |
| [<code>.demo-banner&gt;svg</code>](../client/src/styles.css#L10) | <code>General</code> | <code>margin-left: auto; color: #b5a77f; width: 14px</code> |
| [<code>.page-heading</code>](../client/src/styles.css#L10) | <code>General</code> | <code>display: flex; align-items: center; justify-content: space-between; gap: 20px; margin-bottom: 27px</code> |
| [<code>.page-heading .eyebrow</code>](../client/src/styles.css#L10) | <code>General</code> | <code>font-size: 8px; letter-spacing: 1.2px</code> |
| [<code>.page-heading h1</code>](../client/src/styles.css#L10) | <code>General</code> | <code>font-size: 27px; letter-spacing: -1px; font-weight: 700; margin-top: 9px; color: #153d36</code> |
| [<code>.page-heading p</code>](../client/src/styles.css#L10) | <code>General</code> | <code>font-size: 11px; color: #85978a; margin-top: 8px</code> |
| [<code>.store-picker</code>](../client/src/styles.css#L10) | <code>General</code> | <code>display: flex; align-items: center; gap: 10px; padding: 11px 13px; min-width: 209px; background: white; border: 1px solid #e4ebe4; border-radius: 8px; flex-shrink: 0</code> |
| [<code>.store-icon</code>](../client/src/styles.css#L10) | <code>General</code> | <code>display: flex; align-items: center; justify-content: center; width: 32px; height: 32px; border-radius: 7px; background: #eef5e9; color: #819963</code> |
| [<code>.store-picker small</code>](../client/src/styles.css#L10) | <code>General</code> | <code>display: block; font-size: 7px; letter-spacing: .9px; font-weight: 600; color: #91a08a; margin-bottom: 5px</code> |
| [<code>.store-picker strong</code>](../client/src/styles.css#L10) | <code>General</code> | <code>font-size: 11px; font-weight: 600</code> |
| [<code>.store-picker label</code>](../client/src/styles.css#L10) | <code>General</code> | <code>flex: 1</code> |
| [<code>.store-picker select</code>](../client/src/styles.css#L10) | <code>General</code> | <code>width: 100%; padding: 0 16px 0 0; border: 0; border-radius: 0; min-height: unset; appearance: none; font-size: 11px; cursor: pointer; font-weight: 550</code> |
| [<code>.store-picker&gt;svg</code>](../client/src/styles.css#L10) | <code>General</code> | <code>color: #90a18b</code> |
| [<code>.overview-toolbar</code>](../client/src/styles.css#L10) | <code>General</code> | <code>display: flex; align-items: center; justify-content: space-between; padding-bottom: 19px; gap: 12px</code> |
| [<code>.store-domain</code>](../client/src/styles.css#L10) | <code>General</code> | <code>display: flex; align-items: center; gap: 6px; font-size: 10px; color: #8a9b8d</code> |
| [<code>.store-domain .live-dot</code>](../client/src/styles.css#L10) | <code>General</code> | <code>background: #78a97a; width: 4px; height: 4px</code> |
| [<code>.currency-tag</code>](../client/src/styles.css#L10) | <code>General</code> | <code>font-size: 8px; color: #8c9f8b; padding: 3px 5px; background: #eaf0e6; border-radius: 3px; margin-left: 4px</code> |
| [<code>.date-range</code>](../client/src/styles.css#L10) | <code>General</code> | <code>display: flex; align-items: center; gap: 7px; color: #7a8f7b; font-size: 10px</code> |
| [<code>.date-range&gt;svg</code>](../client/src/styles.css#L10) | <code>General</code> | <code>color: #8c9f8a</code> |
| [<code>.date-caption</code>](../client/src/styles.css#L10) | <code>General</code> | <code>padding: 3px 6px; border-left: 1px solid #dce5d9; color: #9dab94; font-size: 9px; margin-left: 3px</code> |
| [<code>.metrics-grid</code>](../client/src/styles.css#L10) | <code>General</code> | <code>display: grid; grid-template-columns: repeat(4,1fr); gap: 15px; margin-bottom: 23px</code> |
| [<code>.metric-card</code>](../client/src/styles.css#L10) | <code>General</code> | <code>background: white; border: 1px solid var(--line); border-radius: 9px; padding: 17px 18px 17px; box-shadow: 0 2px 3px #42684c02</code> |
| [<code>.metric-top</code>](../client/src/styles.css#L10) | <code>General</code> | <code>display: flex; align-items: center; justify-content: space-between; color: #87968a; font-size: 10px</code> |
| [<code>.metric-icon</code>](../client/src/styles.css#L10) | <code>General</code> | <code>display: flex; align-items: center; justify-content: center; width: 29px; height: 29px; background: #f4f7f0; color: #8ba082; border-radius: 7px</code> |
| [<code>.metric-icon&gt;svg</code>](../client/src/styles.css#L10) | <code>General</code> | <code>width: 16px; height: 16px</code> |
| [<code>.metric-value</code>](../client/src/styles.css#L10) | <code>General</code> | <code>font-family: 'Manrope',sans-serif; font-weight: 750; font-size: 27px; letter-spacing: -.8px; margin-top: 8px; color: #23462e; line-height: 1.5</code> |
| [<code>.metric-bottom</code>](../client/src/styles.css#L10) | <code>General</code> | <code>display: flex; align-items: center; gap: 6px; margin-top: 8px; font-size: 8px; color: #a4afa0; white-space: nowrap</code> |
| [<code>.delta</code>](../client/src/styles.css#L10) | <code>General</code> | <code>font-size: 9px; padding: 3px 5px; border-radius: 4px; font-weight: 550</code> |
| [<code>.delta.positive</code>](../client/src/styles.css#L10) | <code>General</code> | <code>color: #388b58; background: #edf7ec</code> |
| [<code>.delta.negative</code>](../client/src/styles.css#L10) | <code>General</code> | <code>color: #bd8263; background: #fcf1e7</code> |
| [<code>.delta&gt;span</code>](../client/src/styles.css#L10) | <code>General</code> | <code>font-size: 12px; line-height: 0</code> |
| [<code>.panel</code>](../client/src/styles.css#L10) | <code>General</code> | <code>background: white; border: 1px solid var(--line); border-radius: 9px; overflow: hidden; box-shadow: 0 2px 3px #42684c02</code> |
| [<code>.panel-heading</code>](../client/src/styles.css#L10) | <code>General</code> | <code>display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 21px 23px 10px</code> |
| [<code>.panel-heading h2</code>](../client/src/styles.css#L10) | <code>General</code> | <code>font-size: 14px; letter-spacing: -.3px; font-weight: 650; color: #345539</code> |
| [<code>.panel-heading p</code>](../client/src/styles.css#L10) | <code>General</code> | <code>font-size: 9px; color: #96a68f; margin-top: 6px</code> |
| [<code>.source-label</code>](../client/src/styles.css#L10) | <code>General</code> | <code>display: flex; align-items: center; gap: 6px; font-size: 9px; color: #819372</code> |
| [<code>.source-label .provider-mini</code>](../client/src/styles.css#L10) | <code>General</code> | <code>width: 16px; height: 16px; font-size: 10px</code> |
| [<code>.revenue-panel</code>](../client/src/styles.css#L10) | <code>General</code> | <code>margin-bottom: 23px</code> |
| [<code>.chart-wrap</code>](../client/src/styles.css#L10) | <code>General</code> | <code>padding: 0 20px 16px</code> |
| [<code>.chart-hover</code>](../client/src/styles.css#L10) | <code>General</code> | <code>min-height: 30px; font-size: 9px; display: flex; align-items: center; justify-content: flex-end; gap: 10px; color: #9aa996; margin-bottom: 2px</code> |
| [<code>.chart-hover&gt;strong</code>](../client/src/styles.css#L10) | <code>General</code> | <code>font-weight: 550; color: #648562</code> |
| [<code>.chart-currency</code>](../client/src/styles.css#L10) | <code>General</code> | <code>font-size: 8px; border: 1px solid #e4ecdf; border-radius: 3px; padding: 3px 5px</code> |
| [<code>.revenue-chart</code>](../client/src/styles.css#L10) | <code>General</code> | <code>display: block; width: 100%; overflow: visible</code> |
| [<code>.revenue-chart text</code>](../client/src/styles.css#L10) | <code>General</code> | <code>font-family: 'DM Sans',sans-serif; font-size: 9px; fill: #9ea996</code> |
| [<code>.overview-bottom</code>](../client/src/styles.css#L10) | <code>General</code> | <code>display: grid; grid-template-columns: minmax(0,1.4fr) minmax(260px,1fr); gap: 23px</code> |
| [<code>.experiment-stack</code>](../client/src/styles.css#L10) | <code>General</code> | <code>padding: 12px 22px 19px; display: flex; flex-direction: column; gap: 16px</code> |
| [<code>.experiment</code>](../client/src/styles.css#L10) | <code>General</code> | <code>padding: 15px 15px 0; border: 1px solid #e7ede2; border-radius: 8px; background: #fff</code> |
| [<code>.experiment-head</code>](../client/src/styles.css#L10) | <code>General</code> | <code>display: flex; align-items: center; gap: 10px; margin-bottom: 20px</code> |
| [<code>.experiment-icon</code>](../client/src/styles.css#L10) | <code>General</code> | <code>display: flex; align-items: center; justify-content: center; width: 31px; height: 31px; border: 1px solid #e5eddf; border-radius: 7px; color: #8ca777; background: #f6f9f2</code> |
| [<code>.experiment-head&gt;div</code>](../client/src/styles.css#L10) | <code>General</code> | <code>flex: 1; min-width: 0</code> |
| [<code>.experiment-head h3</code>](../client/src/styles.css#L10) | <code>General</code> | <code>font-family: 'DM Sans',sans-serif; font-size: 11px; font-weight: 600; line-height: 1.5; color: #4b6946</code> |
| [<code>.experiment-head p</code>](../client/src/styles.css#L10) | <code>General</code> | <code>font-size: 8px; margin-top: 3px; color: #a1af98</code> |
| [<code>.experiment-head&gt;.pill</code>](../client/src/styles.css#L10) | <code>General</code> | <code>font-size: 8px; padding: 4px 6px</code> |
| [<code>.variant-list</code>](../client/src/styles.css#L10) | <code>General</code> | <code>display: flex; flex-direction: column; gap: 12px</code> |
| [<code>.variant-label</code>](../client/src/styles.css#L10) | <code>General</code> | <code>display: flex; align-items: center; justify-content: space-between; font-size: 9px; color: #829776; margin-bottom: 7px</code> |
| [<code>.variant-label&gt;span</code>](../client/src/styles.css#L10) | <code>General</code> | <code>display: flex; align-items: center; gap: 5px</code> |
| [<code>.variant-label&gt;strong</code>](../client/src/styles.css#L10) | <code>General</code> | <code>font-size: 10px; font-weight: 550; color: #6a8959</code> |
| [<code>.variant-label small</code>](../client/src/styles.css#L10) | <code>General</code> | <code>font-size: 7px; line-height: 1.2; background: #f1f4ed; padding: 2px 4px; border-radius: 3px; color: #a0ad95; margin-left: 3px</code> |
| [<code>.variant-dot</code>](../client/src/styles.css#L10) | <code>General</code> | <code>display: inline-block; width: 5px; height: 5px; border-radius: 50%; flex-shrink: 0</code> |
| [<code>.variant-track</code>](../client/src/styles.css#L10) | <code>General</code> | <code>height: 5px; border-radius: 6px; background: #f3f6ef; overflow: hidden</code> |
| [<code>.variant-fill</code>](../client/src/styles.css#L10) | <code>General</code> | <code>display: block; height: 100%; border-radius: 6px</code> |
| [<code>.variant-0</code>](../client/src/styles.css#L10) | <code>General</code> | <code>background: #b4cfa2</code> |
| [<code>.variant-1</code>](../client/src/styles.css#L10) | <code>General</code> | <code>background: #7db19b</code> |
| [<code>.variant-2</code>](../client/src/styles.css#L10) | <code>General</code> | <code>background: #a2a3d6</code> |
| [<code>.experiment-footer</code>](../client/src/styles.css#L10) | <code>General</code> | <code>display: flex; align-items: center; justify-content: space-between; gap: 10px; border-top: 1px solid #edf1e8; margin-top: 16px; padding: 12px 0; font-size: 8px; color: #9caa8f</code> |
| [<code>.experiment-footer&gt;span:first-child</code>](../client/src/styles.css#L10) | <code>General</code> | <code>display: flex; align-items: center; gap: 5px</code> |
| [<code>.experiment-footer&gt;span:last-child</code>](../client/src/styles.css#L10) | <code>General</code> | <code>color: #8d997c</code> |
| [<code>.experiment-footer svg</code>](../client/src/styles.css#L10) | <code>General</code> | <code>color: #b0bca0; width: 13px</code> |
| [<code>.behavior-panel&gt;.panel-heading</code>](../client/src/styles.css#L10) | <code>General</code> | <code>padding-bottom: 25px</code> |
| [<code>.behavior-panel&gt;.panel-heading&gt;.provider-mini</code>](../client/src/styles.css#L10) | <code>General</code> | <code>width: 24px; height: 24px; font-size: 13px</code> |
| [<code>.behavior-sessions</code>](../client/src/styles.css#L10) | <code>General</code> | <code>position: relative; margin: 0 22px 18px; padding: 16px 18px; background: #f7f8f3; border: 1px solid #eef0e7; border-radius: 7px; overflow: hidden</code> |
| [<code>.behavior-sessions&gt;span</code>](../client/src/styles.css#L10) | <code>General</code> | <code>display: block; font-size: 9px; color: #95a18a</code> |
| [<code>.behavior-sessions&gt;strong</code>](../client/src/styles.css#L10) | <code>General</code> | <code>display: block; font-family: 'Manrope',sans-serif; font-size: 25px; font-weight: 650; color: #668351; margin-top: 7px; letter-spacing: -.7px</code> |
| [<code>.behavior-decoration</code>](../client/src/styles.css#L10) | <code>General</code> | <code>display: flex; align-items: flex-end; gap: 4px; position: absolute; right: 16px; bottom: 18px</code> |
| [<code>.behavior-decoration i</code>](../client/src/styles.css#L10) | <code>General</code> | <code>display: block; width: 6px; border-radius: 2px 2px 0 0; background: #d8e0ca</code> |
| [<code>.behavior-decoration i:nth-child(even)</code>](../client/src/styles.css#L10) | <code>General</code> | <code>background: #c9d7b8</code> |
| [<code>.behavior-stats</code>](../client/src/styles.css#L10) | <code>General</code> | <code>margin: 0 23px</code> |
| [<code>.behavior-stats&gt;div</code>](../client/src/styles.css#L10) | <code>General</code> | <code>display: flex; align-items: center; justify-content: space-between; padding: 15px 0; border-bottom: 1px solid #eef1e8; font-size: 10px; color: #8c9c7c</code> |
| [<code>.behavior-stats&gt;div:last-child</code>](../client/src/styles.css#L10) | <code>General</code> | <code>border-bottom: 0</code> |
| [<code>.behavior-stats&gt;div&gt;span</code>](../client/src/styles.css#L10) | <code>General</code> | <code>display: flex; align-items: center; gap: 7px</code> |
| [<code>.behavior-stats strong</code>](../client/src/styles.css#L10) | <code>General</code> | <code>color: #839473; font-weight: 550; font-size: 11px</code> |
| [<code>.stat-dot</code>](../client/src/styles.css#L10) | <code>General</code> | <code>display: inline-block; width: 6px; height: 6px; border-radius: 2px</code> |
| [<code>.stat-dot.amber</code>](../client/src/styles.css#L10) | <code>General</code> | <code>background: #d9bb75</code> |
| [<code>.stat-dot.rose</code>](../client/src/styles.css#L10) | <code>General</code> | <code>background: #d2a18c</code> |
| [<code>.stat-dot.blue</code>](../client/src/styles.css#L10) | <code>General</code> | <code>background: #93b3c7</code> |
| [<code>.behavior-note</code>](../client/src/styles.css#L10) | <code>General</code> | <code>display: flex; gap: 8px; margin: 18px 22px 20px; padding: 11px 10px; background: #f9faf6; border-radius: 5px; font-size: 8px; color: #a7b196; line-height: 1.7</code> |
| [<code>.behavior-note svg</code>](../client/src/styles.css#L10) | <code>General</code> | <code>color: #b2bea5</code> |
| [<code>.content-footer</code>](../client/src/styles.css#L10) | <code>General</code> | <code>display: flex; align-items: center; justify-content: space-between; gap: 12px; font-size: 8px; color: #a9b2a0; padding: 25px 0 22px; margin-top: 2px</code> |
| [<code>.footer-dot</code>](../client/src/styles.css#L10) | <code>General</code> | <code>display: inline-block; margin: 0 7px</code> |
| [<code>.section-toolbar</code>](../client/src/styles.css#L13) | <code>General</code> | <code>display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 22px</code> |
| [<code>.section-toolbar&gt;.muted</code>](../client/src/styles.css#L13) | <code>General</code> | <code>font-size: 11px</code> |
| [<code>.segmented</code>](../client/src/styles.css#L13) | <code>General</code> | <code>display: flex; gap: 2px; background: #eaf0e8; padding: 4px; border-radius: 7px</code> |
| [<code>.segmented button</code>](../client/src/styles.css#L13) | <code>General</code> | <code>padding: 8px 13px; font-size: 10px; background: none; border: 0; color: #8b9a81; border-radius: 4px</code> |
| [<code>.segmented button.selected</code>](../client/src/styles.css#L13) | <code>General</code> | <code>color: #4d7545; background: #fff; box-shadow: 0 1px 3px #39553812</code> |
| [<code>.experiments-grid</code>](../client/src/styles.css#L13) | <code>General</code> | <code>display: grid; grid-template-columns: repeat(2,1fr); gap: 20px</code> |
| [<code>.experiment-detailed</code>](../client/src/styles.css#L13) | <code>General</code> | <code>padding: 22px 22px 0; background: #fff</code> |
| [<code>.experiment-detailed .experiment-head h3</code>](../client/src/styles.css#L13) | <code>General</code> | <code>font-size: 13px</code> |
| [<code>.experiment-detailed .experiment-head p</code>](../client/src/styles.css#L13) | <code>General</code> | <code>font-size: 9px</code> |
| [<code>.experiment-detailed .variant-label</code>](../client/src/styles.css#L13) | <code>General</code> | <code>font-size: 11px</code> |
| [<code>.experiment-detailed .variant-label&gt;strong</code>](../client/src/styles.css#L13) | <code>General</code> | <code>font-size: 12px</code> |
| [<code>.experiment-detailed .variant-track</code>](../client/src/styles.css#L13) | <code>General</code> | <code>height: 6px</code> |
| [<code>.variant-detail</code>](../client/src/styles.css#L13) | <code>General</code> | <code>display: flex; align-items: center; justify-content: space-between; gap: 6px; font-size: 8px; color: #9ba98c; margin-top: 8px</code> |
| [<code>.experiment-detailed .variant-list</code>](../client/src/styles.css#L13) | <code>General</code> | <code>gap: 20px</code> |
| [<code>.experiment-detailed .experiment-footer</code>](../client/src/styles.css#L13) | <code>General</code> | <code>font-size: 9px; margin-top: 25px</code> |
| [<code>.experiment-disclaimer</code>](../client/src/styles.css#L13) | <code>General</code> | <code>display: flex; align-items: flex-start; gap: 7px; padding: 12px 0 16px; font-size: 8px; color: #a3ae98; line-height: 1.6</code> |
| [<code>.experiment-disclaimer svg</code>](../client/src/styles.css#L13) | <code>General</code> | <code>margin-top: 0px; width: 12px</code> |
| [<code>.explanation-card</code>](../client/src/styles.css#L13) | <code>General</code> | <code>display: flex; gap: 13px; padding: 20px 22px; margin-top: 24px; background: #edf3e9; border: 1px solid #e2ebdb; border-radius: 8px; color: #8a9f78</code> |
| [<code>.explanation-card&gt;svg</code>](../client/src/styles.css#L13) | <code>General</code> | <code>margin-top: 2px; color: #8baa77; width: 20px</code> |
| [<code>.explanation-card strong</code>](../client/src/styles.css#L13) | <code>General</code> | <code>display: block; font-size: 11px; font-weight: 600; color: #678654</code> |
| [<code>.explanation-card p</code>](../client/src/styles.css#L13) | <code>General</code> | <code>font-size: 10px; line-height: 1.8; margin-top: 5px; max-width: 740px</code> |
| [<code>.integrations-grid</code>](../client/src/styles.css#L13) | <code>General</code> | <code>display: grid; grid-template-columns: repeat(3,minmax(0,1fr)); gap: 18px</code> |
| [<code>.integration-card</code>](../client/src/styles.css#L13) | <code>General</code> | <code>padding: 22px</code> |
| [<code>.integration-top</code>](../client/src/styles.css#L13) | <code>General</code> | <code>display: flex; align-items: center; justify-content: space-between</code> |
| [<code>.provider-logo</code>](../client/src/styles.css#L13) | <code>General</code> | <code>display: flex; align-items: center; justify-content: center; width: 43px; height: 43px; border-radius: 11px; font-family: 'Manrope',sans-serif; font-size: 26px; font-weight: 800</code> |
| [<code>.integration-card h2</code>](../client/src/styles.css#L13) | <code>General</code> | <code>font-size: 16px; margin-top: 19px; letter-spacing: -.4px; color: #446541; font-weight: 650</code> |
| [<code>.integration-card&gt;p</code>](../client/src/styles.css#L13) | <code>General</code> | <code>font-size: 10px; line-height: 1.8; color: #98a58c; margin-top: 8px; min-height: 36px</code> |
| [<code>.integration-card dl</code>](../client/src/styles.css#L13) | <code>General</code> | <code>margin: 26px 0 21px; display: flex; flex-direction: column; gap: 15px; font-size: 9px; border-top: 1px solid #ebefe5; padding-top: 17px</code> |
| [<code>.integration-card dl&gt;div</code>](../client/src/styles.css#L13) | <code>General</code> | <code>display: flex; flex-direction: column; gap: 5px</code> |
| [<code>.integration-card dt</code>](../client/src/styles.css#L13) | <code>General</code> | <code>color: #a8b49b; font-size: 8px</code> |
| [<code>.integration-card dd</code>](../client/src/styles.css#L13) | <code>General</code> | <code>margin: 0; color: #779168; overflow-wrap: anywhere</code> |
| [<code>.integration-actions</code>](../client/src/styles.css#L13) | <code>General</code> | <code>display: flex; align-items: center; justify-content: space-between; gap: 7px; flex-wrap: wrap</code> |
| [<code>.integration-actions .button</code>](../client/src/styles.css#L13) | <code>General</code> | <code>font-size: 9px; padding: 9px 11px; min-height: 33px</code> |
| [<code>.client-integration-note</code>](../client/src/styles.css#L13) | <code>General</code> | <code>display: flex; align-items: center; gap: 6px; font-size: 8px; color: #a4b092; border-top: 1px solid #edf1e7; padding-top: 14px</code> |
| [<code>.empty</code>](../client/src/styles.css#L13) | <code>General</code> | <code>display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 46px 25px; text-align: center; gap: 11px; min-height: 230px</code> |
| [<code>.empty-icon</code>](../client/src/styles.css#L13) | <code>General</code> | <code>display: flex; align-items: center; justify-content: center; width: 45px; height: 45px; background: #f0f5eb; color: #9aac8c; border-radius: 12px; margin-bottom: 2px</code> |
| [<code>.empty h3</code>](../client/src/styles.css#L13) | <code>General</code> | <code>font-size: 14px; color: #73925f</code> |
| [<code>.empty p</code>](../client/src/styles.css#L13) | <code>General</code> | <code>font-size: 11px; color: #a0ad93; max-width: 430px; line-height: 1.8</code> |
| [<code>.retry-button</code>](../client/src/styles.css#L13) | <code>General</code> | <code>display: flex; margin: 0 auto 30px</code> |
| [<code>.table-scroll</code>](../client/src/styles.css#L16) | <code>General</code> | <code>overflow-x: auto</code> |
| [<code>.team-panel table</code>](../client/src/styles.css#L16) | <code>General</code> | <code>width: 100%; border-collapse: collapse; text-align: left; white-space: nowrap</code> |
| [<code>.team-panel th</code>](../client/src/styles.css#L16) | <code>General</code> | <code>padding: 18px 22px; font-size: 8px; font-weight: 600; letter-spacing: .8px; text-transform: uppercase; color: #91a583; background: #fafcf7; border-bottom: 1px solid #eaf0e3</code> |
| [<code>.team-panel td</code>](../client/src/styles.css#L16) | <code>General</code> | <code>padding: 18px 22px; font-size: 10px; color: #8c9e7c; border-bottom: 1px solid #edf1e7</code> |
| [<code>.team-panel tr:last-child td</code>](../client/src/styles.css#L16) | <code>General</code> | <code>border-bottom: 0</code> |
| [<code>.table-person</code>](../client/src/styles.css#L16) | <code>General</code> | <code>display: flex; align-items: center; gap: 10px</code> |
| [<code>.table-person strong</code>](../client/src/styles.css#L16) | <code>General</code> | <code>font-size: 11px; font-weight: 550; color: #59754e</code> |
| [<code>.table-person small</code>](../client/src/styles.css#L16) | <code>General</code> | <code>display: block; font-size: 9px; color: #a1ad94; margin-top: 5px</code> |
| [<code>.table-person .avatar</code>](../client/src/styles.css#L16) | <code>General</code> | <code>font-size: 10px; background: #edf3e6; color: #88a36c; border-radius: 8px; width: 32px; height: 32px</code> |
| [<code>.status-text</code>](../client/src/styles.css#L16) | <code>General</code> | <code>display: inline-flex; align-items: center; gap: 5px; font-size: 9px</code> |
| [<code>.modal-backdrop</code>](../client/src/styles.css#L16) | <code>General</code> | <code>position: fixed; inset: 0; z-index: 100; display: flex; align-items: center; justify-content: center; background: #0d2a2666; backdrop-filter: blur(5px); padding: 24px</code> |
| [<code>.modal</code>](../client/src/styles.css#L16) | <code>General</code> | <code>background: white; width: 100%; max-width: 465px; border: 1px solid #e1e9dc; border-radius: 14px; padding: 25px; box-shadow: 0 20px 100px #112c2340; max-height: 90dvh; overflow-y: auto</code> |
| [<code>.modal-heading</code>](../client/src/styles.css#L16) | <code>General</code> | <code>display: flex; align-items: center; justify-content: space-between; gap: 20px</code> |
| [<code>.modal-heading h2</code>](../client/src/styles.css#L16) | <code>General</code> | <code>font-size: 19px; font-weight: 650; color: #456a40; letter-spacing: -.5px</code> |
| [<code>.modal-copy</code>](../client/src/styles.css#L16) | <code>General</code> | <code>font-size: 11px; line-height: 1.8; margin: 12px 0 24px; color: #95a889</code> |
| [<code>.stack-form input,.stack-form select</code>](../client/src/styles.css#L16) | <code>General</code> | <code>font-size: 11px; padding: 12px; border-color: #e1e8db; color: #668356</code> |
| [<code>.stack-form label</code>](../client/src/styles.css#L16) | <code>General</code> | <code>font-size: 10px; color: #6e885e</code> |
| [<code>.modal-actions</code>](../client/src/styles.css#L16) | <code>General</code> | <code>display: flex; align-items: center; justify-content: flex-end; gap: 9px; margin-top: 23px</code> |
| [<code>.modal-actions .button</code>](../client/src/styles.css#L16) | <code>General</code> | <code>font-size: 10px</code> |
| [<code>.form-note</code>](../client/src/styles.css#L16) | <code>General</code> | <code>display: flex; align-items: center; gap: 6px; font-size: 9px; color: #a0af92; margin-top: 5px; line-height: 1.7</code> |
| [<code>.form-row</code>](../client/src/styles.css#L16) | <code>General</code> | <code>display: flex; gap: 14px</code> |
| [<code>.form-row&gt;label</code>](../client/src/styles.css#L16) | <code>General</code> | <code>flex: 1; min-width: 0</code> |
| [<code>.toast</code>](../client/src/styles.css#L16) | <code>General</code> | <code>position: fixed; z-index: 200; bottom: 25px; left: calc(50% + 117px); transform: translateX(-50%); display: flex; align-items: center; gap: 11px; background: white; border: 1px solid #d9e6d0; border-radius: 9px; padding: 14px 16px; color: #678a4d; box-shadow: 0 6px 35px #25402a20; font-size: 11px; max-width: calc(100vw - 40px); width: max-content</code> |
| [<code>.toast&gt;span</code>](../client/src/styles.css#L16) | <code>General</code> | <code>display: flex; align-items: center; justify-content: center; width: 25px; height: 25px; background: #edf6e7; color: #7aa95b; border-radius: 50%; flex-shrink: 0</code> |
| [<code>.toast .icon-button</code>](../client/src/styles.css#L16) | <code>General</code> | <code>margin-left: 5px; color: #a1b192</code> |
| [<code>.sidebar-overlay</code>](../client/src/styles.css#L16) | <code>General</code> | <code>display: none</code> |
| [<code>.main-content</code>](../client/src/styles.css#L19) | <code>@media (min-width:1500px)</code> | <code>padding-top: 32px</code> |
| [<code>.page-heading h1</code>](../client/src/styles.css#L19) | <code>@media (min-width:1500px)</code> | <code>font-size: 30px</code> |
| [<code>.metrics-grid</code>](../client/src/styles.css#L19) | <code>@media (min-width:1500px)</code> | <code>gap: 20px</code> |
| [<code>.metric-card</code>](../client/src/styles.css#L19) | <code>@media (min-width:1500px)</code> | <code>padding: 21px 23px</code> |
| [<code>.metric-value</code>](../client/src/styles.css#L19) | <code>@media (min-width:1500px)</code> | <code>font-size: 31px</code> |
| [<code>.panel-heading</code>](../client/src/styles.css#L19) | <code>@media (min-width:1500px)</code> | <code>padding-top: 24px</code> |
| [<code>.sidebar-insight</code>](../client/src/styles.css#L19) | <code>@media (min-width:1500px)</code> | <code>margin-top: 70px</code> |
| [<code>.sidebar</code>](../client/src/styles.css#L20) | <code>@media (max-width:1150px)</code> | <code>width: 211px; padding-left: 14px; padding-right: 14px</code> |
| [<code>.workspace-body</code>](../client/src/styles.css#L20) | <code>@media (max-width:1150px)</code> | <code>margin-left: 211px; width: calc(100% - 211px)</code> |
| [<code>.topbar</code>](../client/src/styles.css#L20) | <code>@media (max-width:1150px)</code> | <code>padding: 0 26px</code> |
| [<code>.main-content</code>](../client/src/styles.css#L20) | <code>@media (max-width:1150px)</code> | <code>padding-left: 26px; padding-right: 26px</code> |
| [<code>.page-heading h1</code>](../client/src/styles.css#L20) | <code>@media (max-width:1150px)</code> | <code>font-size: 24px</code> |
| [<code>.page-heading&gt;div:first-child</code>](../client/src/styles.css#L20) | <code>@media (max-width:1150px)</code> | <code>max-width: 460px</code> |
| [<code>.page-heading p</code>](../client/src/styles.css#L20) | <code>@media (max-width:1150px)</code> | <code>font-size: 10px; line-height: 1.7</code> |
| [<code>.store-picker</code>](../client/src/styles.css#L20) | <code>@media (max-width:1150px)</code> | <code>min-width: 185px</code> |
| [<code>.metrics-grid</code>](../client/src/styles.css#L20) | <code>@media (max-width:1150px)</code> | <code>gap: 11px</code> |
| [<code>.metric-card</code>](../client/src/styles.css#L20) | <code>@media (max-width:1150px)</code> | <code>padding: 15px 13px</code> |
| [<code>.metric-value</code>](../client/src/styles.css#L20) | <code>@media (max-width:1150px)</code> | <code>font-size: 24px</code> |
| [<code>.metric-top</code>](../client/src/styles.css#L20) | <code>@media (max-width:1150px)</code> | <code>font-size: 9px</code> |
| [<code>.metric-bottom</code>](../client/src/styles.css#L20) | <code>@media (max-width:1150px)</code> | <code>font-size: 7px; gap: 4px</code> |
| [<code>.metric-bottom .delta</code>](../client/src/styles.css#L20) | <code>@media (max-width:1150px)</code> | <code>font-size: 8px</code> |
| [<code>.overview-bottom</code>](../client/src/styles.css#L20) | <code>@media (max-width:1150px)</code> | <code>gap: 16px; grid-template-columns: minmax(0,1.3fr) minmax(230px,1fr)</code> |
| [<code>.experiment-stack</code>](../client/src/styles.css#L20) | <code>@media (max-width:1150px)</code> | <code>padding: 10px 17px 17px</code> |
| [<code>.panel-heading</code>](../client/src/styles.css#L20) | <code>@media (max-width:1150px)</code> | <code>padding-left: 18px; padding-right: 18px</code> |
| [<code>.panel-heading h2</code>](../client/src/styles.css#L20) | <code>@media (max-width:1150px)</code> | <code>font-size: 13px</code> |
| [<code>.panel-heading .text-button</code>](../client/src/styles.css#L20) | <code>@media (max-width:1150px)</code> | <code>font-size: 9px</code> |
| [<code>.experiment-head</code>](../client/src/styles.css#L20) | <code>@media (max-width:1150px)</code> | <code>gap: 8px</code> |
| [<code>.experiment-head h3</code>](../client/src/styles.css#L20) | <code>@media (max-width:1150px)</code> | <code>font-size: 10px</code> |
| [<code>.experiment-head&gt;.pill</code>](../client/src/styles.css#L20) | <code>@media (max-width:1150px)</code> | <code>font-size: 7px</code> |
| [<code>.behavior-decoration</code>](../client/src/styles.css#L20) | <code>@media (max-width:1150px)</code> | <code>gap: 3px; right: 10px</code> |
| [<code>.behavior-decoration i</code>](../client/src/styles.css#L20) | <code>@media (max-width:1150px)</code> | <code>width: 4px</code> |
| [<code>.integrations-grid</code>](../client/src/styles.css#L20) | <code>@media (max-width:1150px)</code> | <code>gap: 12px</code> |
| [<code>.integration-card</code>](../client/src/styles.css#L20) | <code>@media (max-width:1150px)</code> | <code>padding: 17px</code> |
| [<code>.integration-card h2</code>](../client/src/styles.css#L20) | <code>@media (max-width:1150px)</code> | <code>font-size: 14px</code> |
| [<code>.integration-card&gt;p</code>](../client/src/styles.css#L20) | <code>@media (max-width:1150px)</code> | <code>font-size: 9px</code> |
| [<code>.integration-card .pill</code>](../client/src/styles.css#L20) | <code>@media (max-width:1150px)</code> | <code>font-size: 8px; padding: 5px 6px</code> |
| [<code>.toast</code>](../client/src/styles.css#L20) | <code>@media (max-width:1150px)</code> | <code>left: calc(50% + 105px)</code> |
| [<code>.login-story</code>](../client/src/styles.css#L21) | <code>@media (max-width:960px)</code> | <code>padding: 38px 9%</code> |
| [<code>.login-story h1</code>](../client/src/styles.css#L21) | <code>@media (max-width:960px)</code> | <code>font-size: 43px</code> |
| [<code>.login-providers</code>](../client/src/styles.css#L21) | <code>@media (max-width:960px)</code> | <code>gap: 12px</code> |
| [<code>.login-providers&gt;span</code>](../client/src/styles.css#L21) | <code>@media (max-width:960px)</code> | <code>font-size: 9px</code> |
| [<code>.login-main</code>](../client/src/styles.css#L21) | <code>@media (max-width:960px)</code> | <code>padding: 35px</code> |
| [<code>.sidebar</code>](../client/src/styles.css#L21) | <code>@media (max-width:960px)</code> | <code>width: 190px; padding-left: 11px; padding-right: 11px</code> |
| [<code>.sidebar&gt;.brand</code>](../client/src/styles.css#L21) | <code>@media (max-width:960px)</code> | <code>font-size: 23px</code> |
| [<code>.workspace-body</code>](../client/src/styles.css#L21) | <code>@media (max-width:960px)</code> | <code>margin-left: 190px; width: calc(100% - 190px)</code> |
| [<code>.nav-item</code>](../client/src/styles.css#L21) | <code>@media (max-width:960px)</code> | <code>font-size: 11px; gap: 9px</code> |
| [<code>.sidebar-insight</code>](../client/src/styles.css#L21) | <code>@media (max-width:960px)</code> | <code>margin-left: 5px; margin-right: 5px; padding: 16px</code> |
| [<code>.sidebar-insight strong</code>](../client/src/styles.css#L21) | <code>@media (max-width:960px)</code> | <code>font-size: 13px</code> |
| [<code>.topbar</code>](../client/src/styles.css#L21) | <code>@media (max-width:960px)</code> | <code>padding: 0 22px</code> |
| [<code>.main-content</code>](../client/src/styles.css#L21) | <code>@media (max-width:960px)</code> | <code>padding: 22px 22px 0</code> |
| [<code>.page-heading</code>](../client/src/styles.css#L21) | <code>@media (max-width:960px)</code> | <code>align-items: flex-start; gap: 18px</code> |
| [<code>.page-heading h1</code>](../client/src/styles.css#L21) | <code>@media (max-width:960px)</code> | <code>font-size: 22px</code> |
| [<code>.page-heading .eyebrow</code>](../client/src/styles.css#L21) | <code>@media (max-width:960px)</code> | <code>font-size: 7px</code> |
| [<code>.store-picker</code>](../client/src/styles.css#L21) | <code>@media (max-width:960px)</code> | <code>min-width: 170px; padding: 10px</code> |
| [<code>.store-picker label</code>](../client/src/styles.css#L21) | <code>@media (max-width:960px)</code> | <code>max-width: 130px</code> |
| [<code>.store-picker select</code>](../client/src/styles.css#L21) | <code>@media (max-width:960px)</code> | <code>font-size: 10px</code> |
| [<code>.store-picker small</code>](../client/src/styles.css#L21) | <code>@media (max-width:960px)</code> | <code>font-size: 6px</code> |
| [<code>.store-icon</code>](../client/src/styles.css#L21) | <code>@media (max-width:960px)</code> | <code>width: 28px; height: 28px</code> |
| [<code>.metrics-grid</code>](../client/src/styles.css#L21) | <code>@media (max-width:960px)</code> | <code>grid-template-columns: repeat(2,1fr); gap: 13px</code> |
| [<code>.metric-card</code>](../client/src/styles.css#L21) | <code>@media (max-width:960px)</code> | <code>padding: 17px 18px</code> |
| [<code>.metric-top</code>](../client/src/styles.css#L21) | <code>@media (max-width:960px)</code> | <code>font-size: 10px</code> |
| [<code>.metric-value</code>](../client/src/styles.css#L21) | <code>@media (max-width:960px)</code> | <code>font-size: 28px</code> |
| [<code>.metric-bottom</code>](../client/src/styles.css#L21) | <code>@media (max-width:960px)</code> | <code>font-size: 8px</code> |
| [<code>.overview-bottom</code>](../client/src/styles.css#L21) | <code>@media (max-width:960px)</code> | <code>grid-template-columns: 1fr</code> |
| [<code>.behavior-panel&gt;.panel-heading</code>](../client/src/styles.css#L21) | <code>@media (max-width:960px)</code> | <code>padding-bottom: 20px</code> |
| [<code>.behavior-sessions</code>](../client/src/styles.css#L21) | <code>@media (max-width:960px)</code> | <code>float: left; width: 40%; min-height: 116px; margin-right: 0</code> |
| [<code>.behavior-stats</code>](../client/src/styles.css#L21) | <code>@media (max-width:960px)</code> | <code>margin-left: calc(40% + 40px); margin-top: 0; padding-right: 3px</code> |
| [<code>.behavior-stats&gt;div</code>](../client/src/styles.css#L21) | <code>@media (max-width:960px)</code> | <code>padding: 12px 0</code> |
| [<code>.behavior-note</code>](../client/src/styles.css#L21) | <code>@media (max-width:960px)</code> | <code>clear: both; margin-top: 18px</code> |
| [<code>.experiments-grid</code>](../client/src/styles.css#L21) | <code>@media (max-width:960px)</code> | <code>grid-template-columns: 1fr</code> |
| [<code>.integrations-grid</code>](../client/src/styles.css#L21) | <code>@media (max-width:960px)</code> | <code>grid-template-columns: 1fr</code> |
| [<code>.integration-card</code>](../client/src/styles.css#L21) | <code>@media (max-width:960px)</code> | <code>padding: 22px; display: grid; grid-template-columns: 1fr 1fr; column-gap: 25px</code> |
| [<code>.integration-top</code>](../client/src/styles.css#L21) | <code>@media (max-width:960px)</code> | <code>grid-column: 1/-1</code> |
| [<code>.integration-card h2</code>](../client/src/styles.css#L21) | <code>@media (max-width:960px)</code> | <code>font-size: 16px; margin-top: 14px</code> |
| [<code>.integration-card&gt;p</code>](../client/src/styles.css#L21) | <code>@media (max-width:960px)</code> | <code>font-size: 10px; grid-column: 1; min-height: 0</code> |
| [<code>.integration-card dl</code>](../client/src/styles.css#L21) | <code>@media (max-width:960px)</code> | <code>grid-column: 2; grid-row: 2/span 2; margin: 15px 0; border: 0; padding: 0</code> |
| [<code>.integration-card .integration-actions</code>](../client/src/styles.css#L21) | <code>@media (max-width:960px)</code> | <code>grid-column: 1/-1; justify-content: flex-end; margin-top: 14px; border-top: 1px solid #edf1e7; padding-top: 15px</code> |
| [<code>.client-integration-note</code>](../client/src/styles.css#L21) | <code>@media (max-width:960px)</code> | <code>grid-column: 1/-1</code> |
| [<code>.content-footer</code>](../client/src/styles.css#L21) | <code>@media (max-width:960px)</code> | <code>font-size: 7px</code> |
| [<code>.toast</code>](../client/src/styles.css#L21) | <code>@media (max-width:960px)</code> | <code>left: calc(50% + 95px)</code> |
| [<code>.sidebar</code>](../client/src/styles.css#L22) | <code>@media (max-width:720px)</code> | <code>transform: translateX(-100%); width: 234px; padding: 30px 19px 0; transition: transform .2s</code> |
| [<code>.sidebar-open</code>](../client/src/styles.css#L22) | <code>@media (max-width:720px)</code> | <code>transform: translateX(0)</code> |
| [<code>.sidebar-overlay</code>](../client/src/styles.css#L22) | <code>@media (max-width:720px)</code> | <code>display: block; position: fixed; inset: 0; border: 0; background: #102b3260; backdrop-filter: blur(2px); z-index: 25</code> |
| [<code>.workspace-body</code>](../client/src/styles.css#L22) | <code>@media (max-width:720px)</code> | <code>margin-left: 0; width: 100%</code> |
| [<code>.sidebar&gt;.brand</code>](../client/src/styles.css#L22) | <code>@media (max-width:720px)</code> | <code>font-size: 25px</code> |
| [<code>.sidebar-insight</code>](../client/src/styles.css#L22) | <code>@media (max-width:720px)</code> | <code>padding: 19px; margin-left: 8px; margin-right: 8px</code> |
| [<code>.nav-item</code>](../client/src/styles.css#L22) | <code>@media (max-width:720px)</code> | <code>font-size: 12px</code> |
| [<code>.mobile-menu</code>](../client/src/styles.css#L22) | <code>@media (max-width:720px)</code> | <code>display: flex</code> |
| [<code>.topbar</code>](../client/src/styles.css#L22) | <code>@media (max-width:720px)</code> | <code>height: 59px; padding: 0 20px</code> |
| [<code>.topbar-left</code>](../client/src/styles.css#L22) | <code>@media (max-width:720px)</code> | <code>gap: 8px</code> |
| [<code>.topbar-right</code>](../client/src/styles.css#L22) | <code>@media (max-width:720px)</code> | <code>gap: 10px</code> |
| [<code>.main-content</code>](../client/src/styles.css#L22) | <code>@media (max-width:720px)</code> | <code>padding: 19px 20px 0</code> |
| [<code>.demo-banner</code>](../client/src/styles.css#L22) | <code>@media (max-width:720px)</code> | <code>font-size: 9px; line-height: 1.6; margin-bottom: 25px; padding: 9px 11px</code> |
| [<code>.page-heading</code>](../client/src/styles.css#L22) | <code>@media (max-width:720px)</code> | <code>flex-wrap: wrap; gap: 18px</code> |
| [<code>.page-heading h1</code>](../client/src/styles.css#L22) | <code>@media (max-width:720px)</code> | <code>font-size: 27px</code> |
| [<code>.page-heading p</code>](../client/src/styles.css#L22) | <code>@media (max-width:720px)</code> | <code>font-size: 10px</code> |
| [<code>.page-heading .eyebrow</code>](../client/src/styles.css#L22) | <code>@media (max-width:720px)</code> | <code>font-size: 7px</code> |
| [<code>.store-picker</code>](../client/src/styles.css#L22) | <code>@media (max-width:720px)</code> | <code>width: 100%; min-width: 0; padding: 10px 12px</code> |
| [<code>.store-picker label</code>](../client/src/styles.css#L22) | <code>@media (max-width:720px)</code> | <code>max-width: unset</code> |
| [<code>.store-picker small</code>](../client/src/styles.css#L22) | <code>@media (max-width:720px)</code> | <code>font-size: 7px</code> |
| [<code>.store-picker select,.store-picker strong</code>](../client/src/styles.css#L22) | <code>@media (max-width:720px)</code> | <code>font-size: 11px</code> |
| [<code>.store-picker&gt;svg</code>](../client/src/styles.css#L22) | <code>@media (max-width:720px)</code> | <code>margin-left: auto</code> |
| [<code>.overview-toolbar</code>](../client/src/styles.css#L22) | <code>@media (max-width:720px)</code> | <code>padding-bottom: 16px</code> |
| [<code>.date-range</code>](../client/src/styles.css#L22) | <code>@media (max-width:720px)</code> | <code>font-size: 9px; gap: 5px</code> |
| [<code>.date-caption</code>](../client/src/styles.css#L22) | <code>@media (max-width:720px)</code> | <code>font-size: 8px; padding-right: 0</code> |
| [<code>.store-domain</code>](../client/src/styles.css#L22) | <code>@media (max-width:720px)</code> | <code>font-size: 9px</code> |
| [<code>.store-domain .currency-tag</code>](../client/src/styles.css#L22) | <code>@media (max-width:720px)</code> | <code>display: none</code> |
| [<code>.metrics-grid</code>](../client/src/styles.css#L22) | <code>@media (max-width:720px)</code> | <code>gap: 12px; margin-bottom: 17px</code> |
| [<code>.metric-card</code>](../client/src/styles.css#L22) | <code>@media (max-width:720px)</code> | <code>padding: 14px 15px</code> |
| [<code>.metric-value</code>](../client/src/styles.css#L22) | <code>@media (max-width:720px)</code> | <code>font-size: 26px</code> |
| [<code>.metric-bottom</code>](../client/src/styles.css#L22) | <code>@media (max-width:720px)</code> | <code>font-size: 7px</code> |
| [<code>.revenue-panel</code>](../client/src/styles.css#L22) | <code>@media (max-width:720px)</code> | <code>margin-bottom: 17px</code> |
| [<code>.panel-heading</code>](../client/src/styles.css#L22) | <code>@media (max-width:720px)</code> | <code>padding: 18px 18px 8px</code> |
| [<code>.panel-heading h2</code>](../client/src/styles.css#L22) | <code>@media (max-width:720px)</code> | <code>font-size: 13px</code> |
| [<code>.panel-heading p</code>](../client/src/styles.css#L22) | <code>@media (max-width:720px)</code> | <code>font-size: 9px</code> |
| [<code>.chart-wrap</code>](../client/src/styles.css#L22) | <code>@media (max-width:720px)</code> | <code>padding: 0 10px 14px</code> |
| [<code>.chart-hover</code>](../client/src/styles.css#L22) | <code>@media (max-width:720px)</code> | <code>font-size: 8px; padding-right: 8px</code> |
| [<code>.revenue-chart text</code>](../client/src/styles.css#L22) | <code>@media (max-width:720px)</code> | <code>font-size: 10px</code> |
| [<code>.overview-bottom</code>](../client/src/styles.css#L22) | <code>@media (max-width:720px)</code> | <code>gap: 17px</code> |
| [<code>.content-footer</code>](../client/src/styles.css#L22) | <code>@media (max-width:720px)</code> | <code>align-items: flex-start; flex-direction: column; gap: 7px; padding-top: 24px; font-size: 8px</code> |
| [<code>.toast</code>](../client/src/styles.css#L22) | <code>@media (max-width:720px)</code> | <code>left: 50%; font-size: 10px; bottom: 18px</code> |
| [<code>.section-toolbar</code>](../client/src/styles.css#L22) | <code>@media (max-width:720px)</code> | <code>flex-wrap: wrap; gap: 15px</code> |
| [<code>.section-toolbar&gt;.muted</code>](../client/src/styles.css#L22) | <code>@media (max-width:720px)</code> | <code>font-size: 10px</code> |
| [<code>.section-toolbar&gt;.button</code>](../client/src/styles.css#L22) | <code>@media (max-width:720px)</code> | <code>font-size: 10px</code> |
| [<code>.segmented button</code>](../client/src/styles.css#L22) | <code>@media (max-width:720px)</code> | <code>font-size: 9px; padding: 7px 11px</code> |
| [<code>.explanation-card</code>](../client/src/styles.css#L22) | <code>@media (max-width:720px)</code> | <code>padding: 17px</code> |
| [<code>.explanation-card p</code>](../client/src/styles.css#L22) | <code>@media (max-width:720px)</code> | <code>font-size: 9px</code> |
| [<code>.explanation-card strong</code>](../client/src/styles.css#L22) | <code>@media (max-width:720px)</code> | <code>font-size: 10px</code> |
| [<code>.team-panel th,.team-panel td</code>](../client/src/styles.css#L22) | <code>@media (max-width:720px)</code> | <code>padding: 16px</code> |
| [<code>.role-chip</code>](../client/src/styles.css#L22) | <code>@media (max-width:720px)</code> | <code>font-size: 8px</code> |
| [<code>.modal</code>](../client/src/styles.css#L22) | <code>@media (max-width:720px)</code> | <code>padding: 23px</code> |
| [<code>.login-page</code>](../client/src/styles.css#L22) | <code>@media (max-width:720px)</code> | <code>grid-template-columns: 1fr</code> |
| [<code>.login-story</code>](../client/src/styles.css#L22) | <code>@media (max-width:720px)</code> | <code>min-height: unset; padding: 26px 30px 35px</code> |
| [<code>.login-story .brand</code>](../client/src/styles.css#L22) | <code>@media (max-width:720px)</code> | <code>font-size: 25px</code> |
| [<code>.login-story-body</code>](../client/src/styles.css#L22) | <code>@media (max-width:720px)</code> | <code>padding-top: 31px</code> |
| [<code>.login-story h1</code>](../client/src/styles.css#L22) | <code>@media (max-width:720px)</code> | <code>font-size: 38px; line-height: 1.14; letter-spacing: -1.5px; margin-top: 17px</code> |
| [<code>.login-story h1 br:nth-child(2)</code>](../client/src/styles.css#L22) | <code>@media (max-width:720px)</code> | <code>display: none</code> |
| [<code>.login-story-body&gt;p</code>](../client/src/styles.css#L22) | <code>@media (max-width:720px)</code> | <code>margin-top: 17px; font-size: 11px; line-height: 1.8</code> |
| [<code>.login-story-body&gt;p br</code>](../client/src/styles.css#L22) | <code>@media (max-width:720px)</code> | <code>display: none</code> |
| [<code>.login-providers</code>](../client/src/styles.css#L22) | <code>@media (max-width:720px)</code> | <code>margin-top: 18px; gap: 16px</code> |
| [<code>.login-providers&gt;span</code>](../client/src/styles.css#L22) | <code>@media (max-width:720px)</code> | <code>font-size: 9px</code> |
| [<code>.story-visual</code>](../client/src/styles.css#L22) | <code>@media (max-width:720px)</code> | <code>display: none</code> |
| [<code>.login-story-footer</code>](../client/src/styles.css#L22) | <code>@media (max-width:720px)</code> | <code>display: none</code> |
| [<code>.light-eyebrow</code>](../client/src/styles.css#L22) | <code>@media (max-width:720px)</code> | <code>font-size: 7px</code> |
| [<code>.login-main</code>](../client/src/styles.css#L22) | <code>@media (max-width:720px)</code> | <code>padding: 35px 25px</code> |
| [<code>.login-form-wrap</code>](../client/src/styles.css#L22) | <code>@media (max-width:720px)</code> | <code>max-width: 430px</code> |
| [<code>.login-form-wrap h2</code>](../client/src/styles.css#L22) | <code>@media (max-width:720px)</code> | <code>font-size: 27px; margin-top: 16px</code> |
| [<code>.login-form-wrap&gt;.pill</code>](../client/src/styles.css#L22) | <code>@media (max-width:720px)</code> | <code>font-size: 7px</code> |
| [<code>.login-form</code>](../client/src/styles.css#L22) | <code>@media (max-width:720px)</code> | <code>margin-top: 26px</code> |
| [<code>.demo-login</code>](../client/src/styles.css#L22) | <code>@media (max-width:720px)</code> | <code>margin-top: 27px</code> |
| [<code>.login-note</code>](../client/src/styles.css#L22) | <code>@media (max-width:720px)</code> | <code>margin-bottom: 8px</code> |
| [<code>.main-content</code>](../client/src/styles.css#L23) | <code>@media (max-width:380px)</code> | <code>padding-left: 15px; padding-right: 15px</code> |
| [<code>.topbar</code>](../client/src/styles.css#L23) | <code>@media (max-width:380px)</code> | <code>padding-left: 15px; padding-right: 15px</code> |
| [<code>.metric-card</code>](../client/src/styles.css#L23) | <code>@media (max-width:380px)</code> | <code>padding: 13px 12px</code> |
| [<code>.metric-value</code>](../client/src/styles.css#L23) | <code>@media (max-width:380px)</code> | <code>font-size: 23px</code> |
| [<code>.metric-top</code>](../client/src/styles.css#L23) | <code>@media (max-width:380px)</code> | <code>font-size: 9px</code> |
| [<code>.metric-bottom</code>](../client/src/styles.css#L23) | <code>@media (max-width:380px)</code> | <code>font-size: 6px</code> |
| [<code>.page-heading h1</code>](../client/src/styles.css#L23) | <code>@media (max-width:380px)</code> | <code>font-size: 24px</code> |
| [<code>.date-caption</code>](../client/src/styles.css#L23) | <code>@media (max-width:380px)</code> | <code>display: none</code> |
| [<code>.behavior-decoration</code>](../client/src/styles.css#L23) | <code>@media (max-width:380px)</code> | <code>display: none</code> |
| [<code>.behavior-sessions</code>](../client/src/styles.css#L23) | <code>@media (max-width:380px)</code> | <code>padding-left: 13px</code> |
| [<code>.behavior-sessions&gt;strong</code>](../client/src/styles.css#L23) | <code>@media (max-width:380px)</code> | <code>font-size: 22px</code> |
| [<code>.behavior-stats</code>](../client/src/styles.css#L23) | <code>@media (max-width:380px)</code> | <code>margin-left: calc(40% + 33px); font-size: 9px</code> |
| [<code>.behavior-stats&gt;div</code>](../client/src/styles.css#L23) | <code>@media (max-width:380px)</code> | <code>font-size: 9px</code> |
| [<code>.experiment-head&gt;.pill .live-dot</code>](../client/src/styles.css#L23) | <code>@media (max-width:380px)</code> | <code>display: none</code> |
| [<code>.panel-heading .text-button</code>](../client/src/styles.css#L23) | <code>@media (max-width:380px)</code> | <code>font-size: 8px</code> |
| [<code>.variant-detail</code>](../client/src/styles.css#L23) | <code>@media (max-width:380px)</code> | <code>font-size: 7px</code> |
| [<code>.form-row</code>](../client/src/styles.css#L23) | <code>@media (max-width:380px)</code> | <code>flex-direction: column; gap: 0</code> |
| [<code>.integration-card</code>](../client/src/styles.css#L23) | <code>@media (max-width:380px)</code> | <code>padding: 18px; column-gap: 15px</code> |
| [<code>.login-main</code>](../client/src/styles.css#L23) | <code>@media (max-width:380px)</code> | <code>padding: 30px 20px</code> |
| [<code>.login-story</code>](../client/src/styles.css#L23) | <code>@media (max-width:380px)</code> | <code>padding-left: 25px; padding-right: 25px</code> |
| [<code>.add-store-button</code>](../client/src/styles.css#L24) | <code>General</code> | <code>display: flex; align-items: center; justify-content: center; gap: 7px; margin: 17px 10px 0; padding: 10px; border: 1px solid #4a7d6659; border-radius: 6px; background: #23413b80; color: #9fbfa8; font-size: 10px</code> |
| [<code>.add-store-button:hover</code>](../client/src/styles.css#L24) | <code>General</code> | <code>background: #315445; color: #cce5d0</code> |
| [<code>.add-store-button+.sidebar-insight</code>](../client/src/styles.css#L24) | <code>General</code> | <code>margin-top: 26px</code> |
| [<code>.revenue-definition</code>](../client/src/styles.css#L24) | <code>General</code> | <code>font-size: 8px; color: #a5b198; line-height: 1.7; padding: 0 24px 16px</code> |
| [<code>.integration-card&gt;.integration-limit</code>](../client/src/styles.css#L24) | <code>General</code> | <code>font-size: 8px; line-height: 1.7; color: #b09672; background: #fffaf1; border: 1px solid #f1e7d3; border-radius: 5px; padding: 9px; min-height: unset; margin: 0 0 15px; grid-column: 1/-1</code> |
| [<code>&#42;,&#42;::before,&#42;::after</code>](../client/src/styles.css#L25) | <code>@media (prefers-reduced-motion:reduce)</code> | <code>animation-duration: .01ms !important; transition-duration: .01ms !important</code> |

Total: **473 reglas de selectores**, incluidos overrides responsive y pasos de animación. Los valores CSS no representan métricas de negocio.
