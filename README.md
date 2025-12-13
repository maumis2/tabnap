> Uma extensão leve para navegadores Chromium focada em economia de memória e produtividade, utilizando as APIs modernas do Manifest V3.

## 📖 Sobre o Projeto

O projeto foi criado para resolver o problema de consumo excessivo de memória RAM no Google Chrome e navegadores derivados/baseados em Chromium (Edge, Brave, Opera).

Diferente de gerenciadores complexos, esta extensão foca na simplicidade e no uso da **Side Panel API** (Painel Lateral), permitindo que o usuário gerencie suas abas sem pop-ups intrusivos e sem perder o contexto da navegação.

## ✨ Funcionalidades Principais

- **💤 Hibernação de Abas (Tab Discarding):** Libere memória RAM instantaneamente colocando abas inativas para "dormir" sem fechá-las.
- **🛡️ Modo Prioritário (Whitelist):** Marque abas importantes com uma estrela (⭐) para impedir que sejam hibernadas acidentalmente.
- **📑 Painel Lateral (Side Panel):** Interface integrada ao navegador que não fecha ao clicar fora, ideal para multitarefa.
- **🌙 Dark Mode Automático:** Suporte a temas claro e escuro, sincronizado com suas preferências ou alternável manualmente.
- **⚡ Performance First:** Sem scripts de rastreamento, sem animações pesadas e código Vanilla JS puro para máxima velocidade.
- **🔍 Busca Rápida:** Filtre suas abas abertas por título ou URL instantaneamente.

## 🛠️ Instalação (Modo Desenvolvedor)

Como esta extensão ainda não está publicada na Chrome Web Store, você pode instalá-la manualmente:

1. **Clone ou baixe** este repositório em seu computador.
2. Abra o seu navegador (Chrome, Edge, Brave, etc).
3. Na barra de endereços, digite: `chrome://extensions`.
4. No canto superior direito, ative o botão **"Modo do desenvolvedor"** (Developer mode).
5. Clique no botão **"Carregar sem compactação"** (Load unpacked).
6. Selecione a pasta onde você salvou os arquivos deste projeto.
7. Pronto! O ícone aparecerá na sua barra de ferramentas.

## 🚀 Como Usar

1. Clique no ícone da extensão ou abra o Painel Lateral do navegador.
2. **Para economizar memória:** Clique no botão vermelho **"Hibernar Inativas"**. Isso suspenderá todas as abas que não estão em uso e não estão na whitelist.
3. **Para proteger uma aba:** Clique no ícone de estrela (☆) ao lado do título da aba.
4. **Para fechar uma aba:** Clique no "X" vermelho.

## Atualização 1.1!

1. Ajuste de **responsividade**.
2. Criação dos arquivos de tradução para **Pt-BR** e **Inglês**.
3. Ajuste das configurações de acessibilidade e personalização.

## Mais Features e Atualizações em breve!

Criado por Maurício Soares.


