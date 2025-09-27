document.addEventListener('DOMContentLoaded', () => {
    let bomberosData = []; // Variable global para almacenar todos los bomberos

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

    const searchInput = document.getElementById('search-input');
    const searchButton = document.getElementById('search-button');
    const searchType = document.getElementById('search-type');
    const resultsContainer = document.getElementById('results-container');
    const noResultsMessage = document.getElementById('no-results-message');

    // Modal elements
    const bomberoModal = document.getElementById('bombero-modal');
    const closeButton = document.querySelector('.close-button');
    const modalNombreCompleto = document.getElementById('modal-nombre-completo');
    const modalDetailsContent = document.getElementById('modal-details-content');

    // Función para cargar los datos de bomberos.json
    async function loadBomberosData() {
        try {
            const response = await fetch('bomberos.json');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            bomberosData = await response.json();
            displayBomberos(bomberosData); // Mostrar todos los bomberos al inicio
        } catch (error) {
            console.error("Error cargando los datos de bomberos:", error);
            resultsContainer.innerHTML = '<p class="error-message">No se pudieron cargar los datos de los bomberos.</p>';
        }
    }

    // Función para calcular el rendimiento
    function getRendimiento(bombero) {
        const minHoras = MIN_HORAS_POR_GRADO[bombero.gradoJerarquico] || 0; // Si no encuentra el grado, 0 horas
        const porcentaje = (bombero.horasServicio / minHoras) * 100;
        const cumple = bombero.horasServicio >= minHoras;

        return {
            porcentaje: isNaN(porcentaje) ? 0 : Math.min(100, Math.round(porcentaje)), // Limitar a 100% visualmente
            cumple: cumple,
            minHoras: minHoras
        };
    }

    // Función para mostrar los bomberos en el contenedor
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
                <h3>${bombero.nombre} ${bombero.apellidoPaterno}</h3>
                <p><span>Código CBP:</span> ${bombero.codigoCBP}</p>
                <p><span>Grado:</span> ${bombero.gradoJerarquico}</p>
                <p><span>Horas de Servicio:</span> ${bombero.horasServicio}</p>
                <div class="performance-indicator ${rendimientoClass}">
                    ${rendimientoText} (${rendimiento.porcentaje}%)
                </div>
            `;
            resultsContainer.appendChild(card);

            card.addEventListener('click', () => showBomberoDetails(bombero));
        });
    }

    // Función para filtrar los bomberos
    function filterBomberos() {
        const searchTerm = searchInput.value.toLowerCase().trim();
        const type = searchType.value;

        if (searchTerm === '') {
            displayBomberos(bomberosData); // Mostrar todos si la búsqueda está vacía
            return;
        }

        const filteredBomberos = bomberosData.filter(bombero => {
            if (type === 'codigoCBP') {
                return bombero.codigoCBP.toLowerCase().includes(searchTerm);
            } else if (type === 'nombre') {
                const nombreCompleto = `${bombero.nombre} ${bombero.apellidoPaterno} ${bombero.apellidoMaterno}`.toLowerCase();
                return nombreCompleto.includes(searchTerm);
            }
            return false;
        });
        displayBomberos(filteredBomberos);
    }

    // Función para mostrar los detalles del bombero en el modal
    function showBomberoDetails(bombero) {
        modalNombreCompleto.textContent = `${bombero.nombre} ${bombero.apellidoPaterno} ${bombero.apellidoMaterno}`;
        
        const rendimiento = getRendimiento(bombero);
        let rendimientoClass = rendimiento.cumple ? 'cumple' : 'requiere';
        let rendimientoText = rendimiento.cumple ? 'Cumple' : 'Requiere Mejorar';

        modalDetailsContent.innerHTML = `
            <p><strong>Código CBP:</strong> ${bombero.codigoCBP}</p>
            <p><strong>DNI:</strong> ${bombero.dni}</p>
            <p><strong>Teléfono:</strong> ${bombero.telefono}</p>
            <p><strong>Fecha de Nacimiento:</strong> ${bombero.fechaNacimiento}</p>
            <p><strong>Cumpleaños:</strong> ${bombero.cumpleanos}</p>
            <p><strong>Grado Jerárquico:</strong> ${bombero.gradoJerarquico}</p>
            <p><strong>Horas de Servicio:</strong> ${bombero.horasServicio} (Mínimo requerido para su grado: ${rendimiento.minHoras}h)</p>
            <p><strong>Emergencias Atendidas:</strong> ${bombero.emergenciasAtendidas}</p>
            <p><strong>Rendimiento Horas:</strong> 
                <span class="performance-indicator ${rendimientoClass}">
                    ${rendimientoText} (${rendimiento.porcentaje}%)
                </span>
            </p>
            <p><strong>Cursos:</strong></p>
            <ul>
                ${bombero.cursos.map(curso => `<li>${curso}</li>`).join('')}
            </ul>
            <p><strong>Historial de Ascensos:</strong></p>
            <ul>
                ${bombero.resolucionesAscenso.length > 0 ?
                    bombero.resolucionesAscenso.map(res => `<li>${res.grado} (Fecha: ${res.fecha})</li>`).join('') :
                    '<li>Ningún ascenso registrado</li>'
                }
            </ul>
        `;
        bomberoModal.style.display = 'block'; // Mostrar el modal
    }

    // Event Listeners
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

    // Cargar los datos al iniciar la página
    loadBomberosData();
});
