let mapasComparacao = []; // Armazena os mapas lidos do arquivo
let faltandoNoTotemGlobal = []; // Mapas que estão no arquivo, mas não no Totem
let faltandoNoComparacaoGlobal = []; // Mapas que estão no Totem, mas não no arquivo
let invalidTotemMapsGlobal = []; // Mapas inválidos (não numéricos) do totem
let invalidFileMapsGlobal = []; // Mapas inválidos (não numéricos) do arquivo

// === Lógica de Modo Claro/Escuro ===
const body = document.body;
const modeToggleBtn = document.getElementById('modeToggle');
const localStorageKey = 'vlog_theme_mode';

function applyTheme(mode) {
    if (mode === 'light') {
        body.classList.add('light-mode');
        modeToggleBtn.textContent = 'Mudar para Modo Escuro';
    } else {
        body.classList.remove('light-mode');
        modeToggleBtn.textContent = 'Mudar para Modo Claro';
    }
    localStorage.setItem(localStorageKey, mode); // Salva a preferência
}

function toggleTheme() {
    const currentMode = body.classList.contains('light-mode') ? 'light' : 'dark';
    if (currentMode === 'light') {
        applyTheme('dark');
    } else {
        applyTheme('light');
    }
}

// Inicializa o tema ao carregar a página
document.addEventListener('DOMContentLoaded', () => {
    const savedMode = localStorage.getItem(localStorageKey) || 'dark'; // Padrão é escuro
    applyTheme(savedMode);

    if (modeToggleBtn) {
        modeToggleBtn.addEventListener('click', toggleTheme);
    }
});
// === Fim da Lógica de Modo Claro/Escuro ===


// Função auxiliar para extrair apenas os números de uma string
function extractNumbers(str) {
    const match = str.match(/\d+/);
    return match ? match[0] : '';
}

// Função para limpar e deduplicar os mapas, pegando apenas números
function cleanAndDeduplicateMaps(mapList) {
    const cleanedMaps = new Set();
    const invalidMaps = [];

    mapList.forEach(map => {
        if (map && typeof map === 'string') {
            const cleanedMap = extractNumbers(map).trim();
            if (cleanedMap) {
                if (isValidMapFormat(cleanedMap)) {
                    cleanedMaps.add(cleanedMap);
                } else {
                    invalidMaps.push(map); // Adiciona o original para mostrar no alerta
                }
            } else if (map && typeof map === 'number') { // Lida com números diretamente
                const cleanedMap = String(map).trim();
                if (isValidMapFormat(cleanedMap)) {
                    cleanedMaps.add(cleanedMap);
                } else {
                    invalidMaps.push(String(map));
                }
            }
        }
    });
    return { validMaps: Array.from(cleanedMaps), invalidMaps: invalidMaps };
}

// Função para validar se o formato é puramente numérico
function isValidMapFormat(map) {
    return /^\d+$/.test(map);
}

// Event listener para o input de arquivo
document.getElementById('fileInput').addEventListener('change', async (event) => {
    const file = event.target.files[0];
    const statusExcel = document.getElementById('statusExcel');
    const progressBarContainer = document.getElementById('progressBarContainer');
    const progressBar = document.getElementById('progressBar');

    if (!file) {
        statusExcel.textContent = '';
        progressBarContainer.style.display = 'none';
        return;
    }

    statusExcel.textContent = `Carregando ${file.name}...`;
    progressBarContainer.style.display = 'block';
    progressBar.style.width = '0%';
    progressBar.textContent = '0%';

    const reader = new FileReader();

    reader.onprogress = (e) => {
        if (e.lengthComputable) {
            const percent = Math.round((e.loaded / e.total) * 100);
            progressBar.style.width = `${percent}%`;
            progressBar.textContent = `${percent}%`;
        }
    };

    reader.onload = async (e) => {
        let fileContent = e.target.result;
        let rawMapsFromFile = [];

        if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
            // Processa arquivo Excel
            try {
                const workbook = XLSX.read(fileContent, { type: 'array' });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                const excelColumnIndex = parseInt(document.getElementById('excelColumnIndex').value) - 1; // 0-indexed

                if (isNaN(excelColumnIndex) || excelColumnIndex < 0) {
                    Swal.fire({
                        icon: 'error',
                        title: 'Erro de Coluna!',
                        text: 'Por favor, insira um número de coluna válido para o Excel (ex: 1 para a coluna A).',
                        confirmButtonColor: varColor('--primary-button-bg')
                    });
                    statusExcel.textContent = 'Erro ao ler arquivo Excel: Índice de coluna inválido.';
                    progressBarContainer.style.display = 'none';
                    return;
                }

                // Obter a referência da faixa de células (range) da planilha
                const range = XLSX.utils.decode_range(worksheet['!ref']);
                for (let R = range.s.r; R <= range.e.r; ++R) {
                    const cellAddress = XLSX.utils.encode_cell({ r: R, c: excelColumnIndex });
                    const cell = worksheet[cellAddress];
                    if (cell && cell.v !== undefined && cell.v !== null) {
                        rawMapsFromFile.push(String(cell.v).trim());
                    }
                }

            } catch (error) {
                console.error('Erro ao ler arquivo Excel:', error);
                Swal.fire({
                    icon: 'error',
                    title: 'Erro ao Ler Excel!',
                    text: 'Certifique-se de que o arquivo é um Excel válido e a coluna está correta.',
                    confirmButtonColor: varColor('--primary-button-bg')
                });
                statusExcel.textContent = 'Erro ao ler arquivo Excel.';
                progressBarContainer.style.display = 'none';
                return;
            }
        } else if (file.name.endsWith('.txt')) {
            // Processa arquivo TXT
            rawMapsFromFile = fileContent.split('\n').map(line => line.trim()).filter(line => line.length > 0);
        } else {
            Swal.fire({
                icon: 'error',
                title: 'Formato de Arquivo Inválido!',
                text: 'Por favor, selecione um arquivo .xlsx, .xls ou .txt.',
                confirmButtonColor: varColor('--primary-button-bg')
            });
            statusExcel.textContent = 'Formato de arquivo inválido.';
            progressBarContainer.style.display = 'none';
            return;
        }

        const { validMaps, invalidMaps } = cleanAndDeduplicateMaps(rawMapsFromFile);
        mapasComparacao = validMaps;
        invalidFileMapsGlobal = invalidMaps; // Armazena mapas inválidos do arquivo

        statusExcel.textContent = `Arquivo "${file.name}" carregado. ${mapasComparacao.length} mapas válidos encontrados.`;
        progressBar.style.width = '100%';
        progressBar.textContent = '100%';

        setTimeout(() => {
            progressBarContainer.style.display = 'none';
        }, 500); // Esconde a barra após um pequeno atraso

        if (invalidFileMapsGlobal.length > 0) {
            let htmlContent = `<p>O arquivo carregado contém mapas com formato inválido (${invalidFileMapsGlobal.length}):</p>`;
            htmlContent += `<ul>${invalidFileMapsGlobal.map(m => `<li>${m}</li>`).join('')}</ul>`;
            htmlContent += `<button class="copy-button" onclick="copyToClipboard('${invalidFileMapsGlobal.join('\\n')}')">Copiar Mapas Inválidos do Arquivo</button>`;

            await Swal.fire({
                icon: 'warning',
                title: 'Atenção ao Formato do Arquivo!',
                html: htmlContent,
                confirmButtonColor: varColor('--primary-button-bg'),
                width: '600px',
                customClass: {
                    popup: 'swal2-responsive',
                    htmlContainer: 'swal2-html-container'
                }
            });
        } else {
            Swal.fire({
                icon: 'success',
                title: 'Arquivo Carregado!',
                text: `${mapasComparacao.length} mapas válidos do arquivo "${file.name}" foram carregados com sucesso.`,
                toast: true,
                position: 'top-end',
                showConfirmButton: false,
                timer: 3000,
                timerProgressBar: true,
                customClass: {
                    popup: 'swal2-toast'
                }
            });
        }
    };

    reader.onerror = () => {
        Swal.fire({
            icon: 'error',
            title: 'Erro de Leitura!',
            text: 'Não foi possível ler o arquivo.',
            confirmButtonColor: varColor('--primary-button-bg')
        });
        statusExcel.textContent = 'Erro ao ler arquivo.';
        progressBarContainer.style.display = 'none';
    };

    if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
        reader.readAsArrayBuffer(file);
    } else {
        reader.readAsText(file);
    }
});

// Event listener para atualizar a contagem de mapas do totem
document.getElementById('totem').addEventListener('input', function() {
    const totemText = this.value;
    const rawTotemMaps = totemText.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    const { validMaps } = cleanAndDeduplicateMaps(rawTotemMaps);
    document.getElementById('totemMapCount').textContent = validMaps.length;
});

// Função principal para verificar os mapas
async function verificar() {
    const totemText = document.getElementById('totem').value;
    const rawTotemMaps = totemText.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    const { validMaps: totem, invalidMaps: invalidTotemMaps } = cleanAndDeduplicateMaps(rawTotemMaps);
    invalidTotemMapsGlobal = invalidTotemMaps; // Armazena mapas inválidos do totem

    if (totem.length === 0) {
        Swal.fire({
            icon: 'warning',
            title: 'Mapas do Totem Ausentes!',
            text: 'Por favor, cole os mapas do Totem na caixa de texto.',
            confirmButtonColor: varColor('--primary-button-bg')
        });
        return;
    }

    if (mapasComparacao.length === 0) {
        Swal.fire({
            icon: 'warning',
            title: 'Arquivo de Comparação Ausente!',
            text: 'Por favor, carregue um arquivo Excel ou TXT com os mapas para comparar.',
            confirmButtonColor: varColor('--primary-button-bg')
        });
        return;
    }

    // Mostrar SweetAlert de carregamento enquanto a verificação acontece
    Swal.fire({
        title: 'Verificando Mapas...',
        html: '<div class="progress-bar-container" style="display: block; margin-top: 15px;"><div class="progress-bar" id="swalProgressBar" style="width: 0%; text-align: center;">0%</div></div><p id="swalStatusText">Iniciando comparação...</p>',
        allowOutsideClick: false,
        showConfirmButton: false,
        didOpen: () => {
            Swal.showLoading();
            const swalProgressBar = document.getElementById('swalProgressBar');
            const swalStatusText = document.getElementById('swalStatusText');

            let progress = 0;
            const interval = setInterval(() => {
                progress += Math.floor(Math.random() * 15) + 5; // Aumenta o progresso randomicamente
                if (progress >= 100) {
                    progress = 99; // Mantém em 99% até o final
                    clearInterval(interval);
                    swalStatusText.textContent = 'Comparação quase concluída...';
                }
                swalProgressBar.style.width = `${progress}%`;
                swalProgressBar.textContent = `${progress}%`;
                if (progress < 50) {
                    swalStatusText.textContent = 'Processando mapas do Totem...';
                } else if (progress < 80) {
                    swalStatusText.textContent = 'Comparando com o arquivo carregado...';
                }
            }, 300); // Atualiza a cada 300ms
        }
    });

    // Simula um pequeno atraso para a animação da barra de progresso
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Juntar os mapas válidos do arquivo e os do Totem para a comparação
    const mapasParaComparar = mapasComparacao; // Já estão limpos e deduplicados

    // Verificar e alertar sobre mapas com formato inválido
    if (invalidTotemMapsGlobal.length > 0 || invalidFileMapsGlobal.length > 0) {
        let htmlContent = '';
        if (invalidTotemMapsGlobal.length > 0) {
            htmlContent += `<p>Mapas **inválidos no Totem** (${invalidTotemMapsGlobal.length}):</p>`;
            htmlContent += `<ul>${invalidTotemMapsGlobal.map(m => `<li>${m}</li>`).join('')}</ul>`;
            htmlContent += `<button class="copy-button" onclick="copyToClipboard('${invalidTotemMapsGlobal.join('\\n')}')">Copiar Mapas Inválidos do Totem</button>`;
        }
        if (invalidFileMapsGlobal.length > 0) {
            if (invalidTotemMapsGlobal.length > 0) htmlContent += '<br>'; // Adiciona quebra de linha se houver ambos
            htmlContent += `<p>Mapas **inválidos no arquivo** (${invalidFileMapsGlobal.length}):</p>`;
            htmlContent += `<ul>${invalidFileMapsGlobal.map(m => `<li>${m}</li>`).join('')}</ul>`;
            htmlContent += `<button class="copy-button" onclick="copyToClipboard('${invalidFileMapsGlobal.join('\\n')}')">Copiar Mapas Inválidos do Arquivo</button>`;
        }

        await Swal.fire({ // Usar await para esperar o usuário fechar este alerta
            icon: 'warning',
            title: 'Atenção ao Formato!',
            html: htmlContent,
            confirmButtonColor: varColor('--primary-button-bg'),
            width: '600px',
            customClass: {
                popup: 'swal2-responsive',
                htmlContainer: 'swal2-html-container' // Classe para estilizar a lista UL
            }
        });
    }

    // Lógica de comparação
    // Esta parte é síncrona e rápida, mas o "loading" já está ativo
    faltandoNoTotemGlobal = mapasParaComparar.filter(mapa => !totem.includes(mapa));
    faltandoNoComparacaoGlobal = totem.filter(mapa => !mapasParaComparar.includes(mapa));

    renderResults(faltandoNoTotemGlobal, faltandoNoComparacaoGlobal); // Chama a nova função de renderização

    const resultadoDiv = document.getElementById('resultado');
    resultadoDiv.style.display = 'block'; // Mostra a div de resultado
    resultadoDiv.scrollIntoView({ behavior: 'smooth', block: 'start' }); // Rola suavemente para o resultado

    Swal.close(); // Fecha o SweetAlert de carregamento

    // Alerta final com base no resultado da verificação
    if (faltandoNoTotemGlobal.length === 0 && faltandoNoComparacaoGlobal.length === 0) {
        Swal.fire({
            icon: 'success',
            title: 'Verificação Completa!',
            text: 'Todos os mapas estão sincronizados! Ótimo trabalho!',
            confirmButtonColor: varColor('--primary-button-bg')
        });
    } else {
        Swal.fire({
            icon: 'info',
            title: 'Verificação Completa!',
            text: 'Foram encontradas divergências. Verifique os resultados na página.',
            confirmButtonColor: varColor('--primary-button-bg')
        });
    }
}

// Função para renderizar os resultados e aplicar o filtro
function renderResults(faltandoNoTotem, faltandoNoComparacao) {
    const resultListsDiv = document.getElementById('resultLists');
    const filterText = document.getElementById('filterResults').value.toUpperCase();
    let html = '';

    if (faltandoNoTotem.length === 0 && faltandoNoComparacao.length === 0) {
        html += '<p class="ok">🎉 Tudo certo! Todos os mapas do Totem e da lista carregada batem. ✅</p>';
    } else {
        // Faltando no Totem
        const filteredFaltandoNoTotem = faltandoNoTotem.filter(m => m.includes(filterText));
        if(faltandoNoTotem.length === 0) {
            html += '<p class="ok">Todos os mapas da lista carregada estão no totem. ✅</p>';
        } else {
            html += `<p class="falta">Mapas **faltando no totem** (${faltandoNoTotem.length}${filterText ? `, ${filteredFaltandoNoTotem.length} filtrados` : ''}):</p>`;
            if (filteredFaltandoNoTotem.length > 0) {
                html += `<ul>${filteredFaltandoNoTotem.map(m => `<li>${m}</li>`).join('')}</ul>`;
            } else if (filterText) {
                html += `<p style="color: #ccc;">Nenhum mapa corresponde ao filtro nesta categoria.</p>`;
            }
            // Botão para copiar a lista de mapas faltantes (sem filtro)
            if (faltandoNoTotem.length > 0) {
                html += `<button class="copy-button" onclick="copyMissingMaps()">Copiar Mapas Faltando no Totem</button>`;
            }
        }

        // Não encontrados na comparação
        const filteredFaltandoNoComparacao = faltandoNoComparacao.filter(m => m.includes(filterText));
        if(faltandoNoComparacao.length === 0) {
            html += '<p class="ok">Todos os mapas do totem estão na lista carregada. ✅</p>';
        } else {
            html += `<p class="falta">Mapas do totem **não encontrados na lista carregada** (${faltandoNoComparacao.length}${filterText ? `, ${filteredFaltandoNoComparacao.length} filtrados` : ''}):</p>`;
            if (filteredFaltandoNoComparacao.length > 0) {
                html += `<ul>${filteredFaltandoNoComparacao.map(m => `<li>${m}</li>`).join('')}</ul>`;
            } else if (filterText) {
                html += `<p style="color: #ccc;">Nenhum mapa corresponde ao filtro nesta categoria.</p>`;
            }
            // Adicione um botão para copiar os mapas não encontrados na comparação, se necessário
            if (faltandoNoComparacao.length > 0) {
                html += `<button class="copy-button" onclick="copyNotFoundMaps()">Copiar Mapas Não Encontrados na Lista Carregada</button>`;
            }
        }
    }
    resultListsDiv.innerHTML = html;
}

// Event listener para o campo de filtro
document.getElementById('filterResults').addEventListener('input', function() {
    // Rederiza os resultados novamente, aplicando o filtro
    renderResults(faltandoNoTotemGlobal, faltandoNoComparacaoGlobal);
});

// Função para copiar os mapas faltantes para a área de transferência
function copyMissingMaps() {
    if (faltandoNoTotemGlobal.length > 0) {
        const mapsToCopy = faltandoNoTotemGlobal.join('\n');
        navigator.clipboard.writeText(mapsToCopy)
            .then(() => {
                Swal.fire({
                    icon: 'success',
                    title: 'Copiado!',
                    text: 'Mapas faltantes copiados para a área de transferência.',
                    toast: true,
                    position: 'top-end',
                    showConfirmButton: false,
                    timer: 2000,
                    timerProgressBar: true,
                    customClass: {
                        popup: 'swal2-toast'
                    }
                });
            })
            .catch(err => {
                console.error('Erro ao copiar: ', err);
                Swal.fire({
                    icon: 'error',
                    title: 'Erro!',
                    text: 'Não foi possível copiar os mapas. Tente manualmente.',
                    confirmButtonColor: varColor('--primary-button-bg')
                });
            });
    }
}

// Nova função para copiar mapas não encontrados na lista de comparação
function copyNotFoundMaps() {
    if (faltandoNoComparacaoGlobal.length > 0) {
        const mapsToCopy = faltandoNoComparacaoGlobal.join('\n');
        navigator.clipboard.writeText(mapsToCopy)
            .then(() => {
                Swal.fire({
                    icon: 'success',
                    title: 'Copiado!',
                    text: 'Mapas não encontrados na lista de comparação copiados.',
                    toast: true,
                    position: 'top-end',
                    showConfirmButton: false,
                    timer: 2000,
                    timerProgressBar: true,
                    customClass: {
                        popup: 'swal2-toast'
                    }
                });
            })
            .catch(err => {
                console.error('Erro ao copiar: ', err);
                Swal.fire({
                    icon: 'error',
                    title: 'Erro!',
                    text: 'Não foi possível copiar os mapas. Tente manualmente.',
                    confirmButtonColor: varColor('--primary-button-bg')
                });
            });
    }
}

// Função genérica para copiar texto para a área de transferência (usada para os mapas inválidos)
function copyToClipboard(text) {
    navigator.clipboard.writeText(text.replace(/\\n/g, '\n')) // Substitui \n por quebra de linha real
        .then(() => {
            Swal.fire({
                icon: 'success',
                title: 'Copiado!',
                text: 'Conteúdo copiado para a área de transferência.',
                toast: true,
                position: 'top-end',
                showConfirmButton: false,
                timer: 2000,
                timerProgressBar: true,
                customClass: {
                    popup: 'swal2-toast'
                }
            });
        })
        .catch(err => {
            console.error('Erro ao copiar: ', err);
            Swal.fire({
                icon: 'error',
                title: 'Erro!',
                text: 'Não foi possível copiar o conteúdo. Tente manualmente.',
                confirmButtonColor: varColor('--primary-button-bg')
            });
        });
}


// Função para limpar todos os campos e estados
function clearFields() {
    Swal.fire({
        title: 'Tem certeza?',
        text: "Isso limpará todos os campos e resultados!",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: varColor('--primary-button-bg'),
        cancelButtonColor: varColor('--danger-color'),
        confirmButtonText: 'Sim, limpar!',
        cancelButtonText: 'Cancelar'
    }).then((result) => {
        if (result.isConfirmed) {
            document.getElementById('totem').value = '';
            document.getElementById('fileInput').value = ''; // Limpa o arquivo selecionado
            document.getElementById('statusExcel').textContent = '';
            document.getElementById('progressBarContainer').style.display = 'none';
            document.getElementById('resultado').style.display = 'none';
            document.getElementById('filterResults').value = '';
            document.getElementById('resultLists').innerHTML = '';

            mapasComparacao = [];
            faltandoNoTotemGlobal = [];
            faltandoNoComparacaoGlobal = [];
            invalidTotemMapsGlobal = [];
            invalidFileMapsGlobal = [];
            
            document.getElementById('totem').dispatchEvent(new Event('input')); // Atualiza a contagem
            Swal.fire('Limpo!', 'Todos os campos foram limpos.', 'success');
        }
    });
}

// Função para salvar os mapas do totem no localStorage
function saveTotemMaps() {
    const totemMaps = document.getElementById('totem').value;
    if (totemMaps.trim() === '') {
        Swal.fire({
            icon: 'warning',
            title: 'Nada para Salvar!',
            text: 'A caixa de mapas do Totem está vazia.',
            confirmButtonColor: varColor('--primary-button-bg')
        });
        return;
    }
    localStorage.setItem('vlog_totem_maps', totemMaps);
    Swal.fire({
        icon: 'success',
        title: 'Salvo!',
        text: 'Mapas do Totem salvos com sucesso no seu navegador.',
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 2000,
        timerProgressBar: true,
        customClass: {
            popup: 'swal2-toast'
        }
    });
}

// Função para carregar os mapas do totem do localStorage
function loadTotemMaps() {
    const savedMaps = localStorage.getItem('vlog_totem_maps');
    if (savedMaps) {
        document.getElementById('totem').value = savedMaps;
        document.getElementById('totem').dispatchEvent(new Event('input')); // Atualiza a contagem
        Swal.fire({
            icon: 'success',
            title: 'Carregado!',
            text: 'Mapas do Totem carregados do seu navegador.',
            toast: true,
            position: 'top-end',
            showConfirmButton: false,
            timer: 2000,
            timerProgressBar: true,
            customClass: {
                popup: 'swal2-toast'
            }
        });
    } else {
        Swal.fire({
            icon: 'info',
            title: 'Nada Salvo!',
            text: 'Nenhum mapa do Totem encontrado salvo no seu navegador.',
            confirmButtonColor: varColor('--primary-button-bg')
        });
    }
}
    
// Relógio digital estilo LED
function atualizarRelogio() {
    const agora = new Date();
    const hora = String(agora.getHours()).padStart(2, '0');
    const min = String(agora.getMinutes()).padStart(2, '0');
    const seg = String(agora.getSeconds()).padStart(2, '0');
    document.getElementById('clock').textContent = `${hora}:${min}:${seg}`;
}
// Atualiza o relógio a cada segundo
setInterval(atualizarRelogio, 1000);
// Chama a função imediatamente para exibir o relógio ao carregar a página
atualizarRelogio();

// Função auxiliar para obter valores de variáveis CSS no JavaScript
function varColor(variable) {
    return getComputedStyle(document.documentElement).getPropertyValue(variable);
}