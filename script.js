document.addEventListener('DOMContentLoaded', () => {
    let bomberosData = []; // Variable global para almacenar todos los bomberos
    // Variable para almacenar los datos del archivo cargado antes de procesar
    let rawFileData = null; 

    // Definir los mínimos de horas de servicio por grado jerárquico
    const MIN_HORAS_POR_GRADO = {
        "Bombero": 500,
        "Cabo": 800,
        "Sargento": 1200,
        "Teniente": 1600,
        "Capitán": 2000,
        "Mayor": 2500,
        "Comandante": 3000,
        "Brigadier": 3500,
        "Brigadier General": 4000
        // Puedes añadir más grados y sus mínimos
    };

    // Referencias a elementos del DOM
    const searchInput = document.getElementById('search-input');
    const searchButton = document.getElementById('search-button');
    const searchType = document.getElementById('search-type');
    const resultsContainer = document.getElementById('results-container');
    const noResultsMessage = document.getElementById('no-results-message');

    // NUEVO: Elementos para cargar Excel/CSV
    const excelFileInput = document.getElementById('excel-file-input');
    const loadExcelButton = document.getElementById('load-excel-button');
    const fileNameDisplay = document.getElementById('file-name-display');

    // Modal elements
    const bomberoModal = document.getElementById('bombero-modal');
    const closeButton = document.querySelector('.close-button');
    const modalNombreCompleto = document.getElementById('modal-nombre-completo');
    const modalDetailsContent = document.getElementById('modal-details-content');

    // Función para cargar los datos de bomberos.json (inicialmente)
    // Se mantiene esta función por si no se carga un archivo y se quiere usar la data por defecto
    async function loadDefaultBomberosData() {
        try {
            const response = await fetch('bomberos.json');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            bomberosData = await response.json();
            displayBomberos(bomberosData); // Mostrar todos los bomberos al inicio
        } catch (error) {
            console.error("Error cargando los datos de bomberos por defecto:", error);
            resultsContainer.innerHTML = '<p class="error-message">No se pudieron cargar los datos de los bomberos por defecto. Por favor, cargue un archivo Excel/CSV.</p>';
        }
    }

    // NUEVO: Función para procesar un archivo Excel/CSV cargado
    function processExcelFile(file) {
        const reader = new FileReader();

        reader.onload = (e) => {
            const data = e.target.result;
            const workbook = XLSX.read(data, { type: 'binary' });
            
            // Suponemos que la primera hoja contiene los datos de los bomberos
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];

            // Convertir la hoja de cálculo a un array de objetos JSON
            // El header:1 asegura que la primera fila se use como cabecera (nombres de las propiedades)
            // raw:true mantiene los valores tal cual están en Excel (sin formatear fechas, etc.)
            const jsonFromExcel = XLSX.utils.sheet_to_json(worksheet, { header: 1, raw: false });

            // Ahora necesitamos mapear las columnas del Excel a nuestro formato JSON esperado
            // Asegúrate que los nombres de las columnas en tu Excel coincidan con estas claves.
            // Ejemplo:
            // "Nombre", "Apellido Paterno", "Apellido Materno", "Código CBP", "DNI",
            // "Cursos", "Resoluciones Ascenso", "Teléfono", "Cumpleaños", "Fecha Nacimiento",
            // "Horas Servicio", "Emergencias Atendidas", "Grado Jerárquico"
            
            if (jsonFromExcel.length === 0) {
                alert('El archivo Excel/CSV está vacío o no tiene encabezados.');
                bomberosData = []; // Limpiar datos si el archivo está vacío
                displayBomberos([]);
                return;
            }

            const headers = jsonFromExcel[0]; // La primera fila son los encabezados
            const excelRows = jsonFromExcel.slice(1); // El resto son los datos

            const processedBomberos = excelRows.map((row, index) => {
                const bombero = {};
                headers.forEach((header, i) => {
                    // Normalizar el nombre del encabezado para que coincida con nuestras claves JSON
                    let key = header.trim()
                                .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // Quitar tildes
                                .replace(/\s+/g, '') // Quitar espacios
                                .replace(/[^a-zA-Z0-9]/g, ''); // Quitar caracteres especiales
                    
                    // Mapeo manual para asegurar que los nombres de Excel coincidan con las claves de nuestro JSON
                    if (key.toLowerCase().includes('nombre') && !key.toLowerCase().includes('apellido')) key = 'nombre';
                    else if (key.toLowerCase().includes('apellidopaterno')) key = 'apellidoPaterno';
                    else if (key.toLowerCase().includes('apellidomaterno')) key = 'apellidoMaterno';
                    else if (key.toLowerCase().includes('codigocbp')) key = 'codigoCBP';
                    else if (key.toLowerCase().includes('dni')) key = 'dni';
                    else if (key.toLowerCase().includes('cursos')) key = 'cursos';
                    else if (key.toLowerCase().includes('resolucionesascenso')) key = 'resolucionesAscenso';
                    else if (key.toLowerCase().includes('telefono') || key.toLowerCase().includes('celular')) key = 'telefono';
                    else if (key.toLowerCase().includes('cumpleanos')) key = 'cumpleanos';
                    else if (key.toLowerCase().includes('fechanacimiento')) key = 'fechaNacimiento';
                    else if (key.toLowerCase().includes('horasservicio')) key = 'horasServicio';
                    else if (key.toLowerCase().includes('emergenciasatendidas')) key = 'emergenciasAtendidas';
                    else if (key.toLowerCase().includes('gradojerarquico')) key = 'gradoJerarquico';
                    // Si tienes más columnas en tu Excel, añádelas aquí

                    let value = row[i];

                    // Convertir tipos de datos si es necesario
                    if (key === 'horasServicio' || key === 'emergenciasAtendidas') {
                        bombero[key] = parseInt(value) || 0;
                    } else if (key === 'cursos') {
                        // Asume que los cursos están separados por comas en la celda de Excel
                        bombero[key] = value ? value.split(',').map(c => c.trim()) : [];
                    } else if (key === 'resolucionesAscenso') {
                        // Esto es más complejo. Asume un formato específico en Excel o maneja de forma manual.
                        // Por ahora, lo dejaremos como un string y asumiremos que el usuario puede ver el formato
                        // o lo procesamos más a fondo si definimos un formato estándar.
                        // Ejemplo: "2010-01-15:Cabo;2015-07-20:Sargento"
                        bombero[key] = value ? value.split(';').map(res => {
                            const parts = res.split(':');
                            return { fecha: parts[0] ? parts[0].trim() : '', grado: parts[1] ? parts[1].trim() : '' };
                        }) : [];
                    } else if (key === 'id') {
                        // Generar un ID si no viene o asegurarse que sea un número
                        bombero[key] = parseInt(value) || (index + 1);
                    }
                     else {
                        bombero[key] = value;
                    }
                });
                return bombero;
            });

            bomberosData = processedBomberos;
            displayBomberos(bomberosData); // Mostrar los nuevos datos
            alert('Datos cargados y procesados correctamente desde el archivo.');

        };

        reader.onerror = (ex) => {
            console.error(ex);
            alert('Error al leer el archivo.');
        };

        reader.readAsBinaryString(file);
    }

    // Función para calcular el rendimiento (se mantiene igual)
    function getRendimiento(bombero) {
        const minHoras = MIN_HORAS_POR_GRADO[bombero.gradoJerarquico] || 0; // Si no encuentra el grado, 0 horas
        const porcentaje = (bombero.horasServicio / minHoras) * 100;
        const cumple = bombero.horasServicio >= minHoras;

        return {
            porcentaje: isNaN(porcentaje) || !isFinite(porcentaje) ? 0 : Math.min(100, Math.round(porcentaje)), // Limitar a 100% visualmente
            cumple: cumple,
            minHoras: minHoras
        };
    }

    // Función para mostrar los bomberos en el contenedor (se mantiene igual)
    function displayBomberos(bomberosToDisplay) {
        resultsContainer.innerHTML = ''; // Limpiar resultados anteriores
        if (bomberosToDisplay.length === 0) {
            noResultsMessage.style.display = 'block';
            return;
        } else {
            noResultsMessage.style.display = 'none';
        }

        bomberosToDisplay.forEach(bombero => {
            const rendimiento = getRendimiento(bombero);
            const card = document.createElement('div');
            card.classList.add('bombero-card');
            card.dataset.bomberoId = bombero.id; // Para identificar el bombero al hacer clic

            let rendimientoClass = rendimiento.cumple ? 'cumple' : 'requiere';
            let rendimientoText = rendimiento.cumple ? 'Cumple' : 'Requiere Mejorar';

            card.innerHTML = `
                <h3>${bombero.nombre} ${bombero.apellidoPaterno || ''}</h3>
                <p><span>Código CBP:</span> ${bombero.codigoCBP || 'N/A'}</p>
                <p><span>Grado:</span> ${bombero.gradoJerarquico || 'N/A'}</p>
                <p><span>Horas de Servicio:</span> ${bombero.horasServicio || 0}</p>
                <div class="performance-indicator ${rendimientoClass}">
                    ${rendimientoText} (${rendimiento.porcentaje}%)
                </div>
            `;
            resultsContainer.appendChild(card);

            card.addEventListener('click', () => showBomberoDetails(bombero));
        });
    }

    // Función para filtrar los bomberos (se mantiene igual)
    function filterBomberos() {
        const searchTerm = searchInput.value.toLowerCase().trim();
        const type = searchType.value;

        if (searchTerm === '') {
            displayBomberos(bomberosData); // Mostrar todos si la búsqueda está vacía
            return;
        }

        const filteredBomberos = bomberosData.filter(bombero => {
            if (type === 'codigoCBP') {
                return (bombero.codigoCBP || '').toLowerCase().includes(searchTerm);
            } else if (type === 'nombre') {
                const nombreCompleto = `${bombero.nombre || ''} ${bombero.apellidoPaterno || ''} ${bombero.apellidoMaterno || ''}`.toLowerCase();
                return nombreCompleto.includes(searchTerm);
            }
            return false;
        });
        displayBomberos(filteredBomberos);
    }

    // Función para mostrar los detalles del bombero en el modal (se mantiene casi igual, con mejoras de seguridad y manejo de datos faltantes)
    function showBomberoDetails(bombero) {
        modalNombreCompleto.textContent = `${bombero.nombre || ''} ${bombero.apellidoPaterno || ''} ${bombero.apellidoMaterno || ''}`;
        
        const rendimiento = getRendimiento(bombero);
        let rendimientoClass = rendimiento.cumple ? 'cumple' : 'requiere';
        let rendimientoText = rendimiento.cumple ? 'Cumple' : 'Requiere Mejorar';

        modalDetailsContent.innerHTML = `
            <p><strong>Código CBP:</strong> ${bombero.codigoCBP || 'N/A'}</p>
            <p><strong>DNI:</strong> ${bombero.dni || 'N/A'}</p>
            <p><strong>Teléfono:</strong> ${bombero.telefono || 'N/A'}</p>
            <p><strong>Fecha de Nacimiento:</strong> ${bombero.fechaNacimiento || 'N/A'}</p>
            <p><strong>Cumpleaños:</strong> ${bombero.cumpleanos || 'N/A'}</p>
            <p><strong>Grado Jerárquico:</strong> ${bombero.gradoJerarquico || 'N/A'}</p>
            <p><strong>Horas de Servicio:</strong> ${bombero.horasServicio || 0} (Mínimo requerido para su grado: ${rendimiento.minHoras}h)</p>
            <p><strong>Emergencias Atendidas:</strong> ${bombero.emergenciasAtendidas || 0}</p>
            <p><strong>Rendimiento Horas:</strong> 
                <span class="performance-indicator ${rendimientoClass}">
                    ${rendimientoText} (${rendimiento.porcentaje}%)
                </span>
            </p>
            <p><strong>Cursos:</strong></p>
            <ul>
                ${bombero.cursos && bombero.cursos.length > 0 ?
                    bombero.cursos.map(curso => `<li>${curso}</li>`).join('') :
                    '<li>Ningún curso registrado</li>'
                }
            </ul>
            <p><strong>Historial de Ascensos:</strong></p>
            <ul>
                ${bombero.resolucionesAscenso && bombero.resolucionesAscenso.length > 0 ?
                    bombero.resolucionesAscenso.map(res => `<li>${res.grado} (Fecha: ${res.fecha})</li>`).join('') :
                    '<li>Ningún ascenso registrado</li>'
                }
            </ul>
        `;
        bomberoModal.style.display = 'block'; // Mostrar el modal
    }

    // Event Listeners (se modifican para incluir los nuevos elementos)
    searchButton.addEventListener('click', filterBomberos);
    searchInput.addEventListener('keyup', (event) => {
        if (event.key === 'Enter') { // Filtrar al presionar Enter
            filterBomberos();
        } else if (searchInput.value === '') {
            displayBomberos(bomberosData); // Si se borra el input, mostrar todos
        }
    });

    closeButton.addEventListener('click', () => {
        bomberoModal.style.display = 'none'; // Ocultar el modal al hacer clic en la "X"
    });

    // Ocultar el modal si se hace clic fuera de su contenido
    window.addEventListener('click', (event) => {
        if (event.target === bomberoModal) {
            bomberoModal.style.display = 'none';
        }
    });

    // NUEVO: Event listener para el input de archivo
    excelFileInput.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (file) {
            rawFileData = file; // Almacenar el archivo para procesar después
            fileNameDisplay.textContent = file.name; // Mostrar el nombre del archivo
        } else {
            rawFileData = null;
            fileNameDisplay.textContent = 'Cargar Base de Datos (Excel/CSV)';
        }
    });

    // NUEVO: Event listener para el botón de procesar archivo
    loadExcelButton.addEventListener('click', () => {
        if (rawFileData) {
            processExcelFile(rawFileData);
        } else {
            alert('Por favor, selecciona un archivo Excel/CSV primero.');
        }
    });


    // Cargar los datos por defecto al iniciar la página
    loadDefaultBomberosData();
});
