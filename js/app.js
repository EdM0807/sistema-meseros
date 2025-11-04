// Aplicación principal
class AppMeseros {
    constructor() {
        this.currentSection = 'mesas';
        this.currentPedido = {
            mesaId: null,
            items: [],
            observaciones: ''
        };
        this.init();
    }

    async init() {
        this.setupEventListeners();
        await this.loadInitialData();
        this.updateTime();
        setInterval(() => this.updateTime(), 1000);
    }

    setupEventListeners() {
        // Navegación
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.switchSection(e.currentTarget.dataset.section);
            });
        });

        // Modales
        document.querySelectorAll('.close').forEach(close => {
            close.addEventListener('click', (e) => {
                this.closeModal(e.target.closest('.modal'));
            });
        });

        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.closeModal(modal);
                }
            });
        });

        // Filtros
        document.getElementById('filter-ubicacion').addEventListener('change', (e) => {
            this.filterMesas(e.target.value);
        });
    }

    switchSection(section) {
        // Actualizar navegación
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-section="${section}"]`).classList.add('active');

        // Mostrar sección
        document.querySelectorAll('.content-section').forEach(sec => {
            sec.classList.remove('active');
        });
        document.getElementById(`${section}-section`).classList.add('active');

        this.currentSection = section;

        // Cargar datos específicos de la sección
        switch(section) {
            case 'mesas':
                this.loadMesas();
                break;
            case 'pedidos':
                this.loadPedidos();
                break;
            case 'cuentas':
                this.loadCuentas();
                break;
        }
    }

    updateTime() {
        const now = new Date();
        document.getElementById('current-time').textContent = 
            now.toLocaleTimeString('es-MX', { 
                hour: '2-digit', 
                minute: '2-digit',
                second: '2-digit'
            }) + ' - ' +
            now.toLocaleDateString('es-MX', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
    }

    async loadInitialData() {
        try {
            await this.loadMesas();
        } catch (error) {
            this.showError('Error cargando datos iniciales. Verifica la conexión.');
        }
    }

    async loadMesas() {
        try {
            const mesas = await api.getMesas();
            this.renderMesas(mesas);
        } catch (error) {
            this.showError('Error cargando mesas. El backend puede no estar disponible.');
        }
    }

    renderMesas(mesas) {
        const container = document.getElementById('mesas-container');
        container.innerHTML = '';
        
        if (mesas.length === 0) {
            container.innerHTML = '<p class="no-data">No hay mesas disponibles</p>';
            return;
        }
        
        mesas.forEach(mesa => {
            const mesaCard = this.createMesaCard(mesa);
            container.appendChild(mesaCard);
        });
    }

    createMesaCard(mesa) {
        const card = document.createElement('div');
        card.className = `mesa-card ${mesa.estado}`;
        card.innerHTML = `
            <div class="mesa-header">
                <div class="mesa-nombre">${mesa.nombre}</div>
                <div class="mesa-estado estado-${mesa.estado}">
                    ${mesa.estado.charAt(0).toUpperCase() + mesa.estado.slice(1)}
                </div>
            </div>
            <div class="mesa-info">
                <span><i class="fas fa-users"></i> ${mesa.capacidad} personas</span>
                <span><i class="fas fa-map-marker-alt"></i> ${mesa.ubicacion}</span>
            </div>
            <div class="mesa-actions">
                ${mesa.estado === 'libre' ? 
                    `<button class="btn btn-primary btn-sm ocupar-mesa" data-mesa-id="${mesa.id}">
                        <i class="fas fa-utensils"></i> Ocupar
                    </button>` : 
                    `<button class="btn btn-success btn-sm ver-pedido" data-mesa-id="${mesa.id}">
                        <i class="fas fa-eye"></i> Ver Pedido
                    </button>
                    <button class="btn btn-warning btn-sm ver-cuenta" data-mesa-id="${mesa.id}">
                        <i class="fas fa-receipt"></i> Cuenta
                    </button>`
                }
            </div>
        `;

        // Event listeners para los botones
        if (mesa.estado === 'libre') {
            card.querySelector('.ocupar-mesa').addEventListener('click', () => {
                this.openPedidoModal(mesa);
            });
        } else {
            card.querySelector('.ver-pedido').addEventListener('click', () => {
                this.verPedidoMesa(mesa);
            });
            card.querySelector('.ver-cuenta').addEventListener('click', () => {
                this.openCuentaModal(mesa);
            });
        }

        return card;
    }

    filterMesas(ubicacion) {
        const mesas = document.querySelectorAll('.mesa-card');
        mesas.forEach(mesa => {
            const mesaUbicacion = mesa.querySelector('.mesa-info span:last-child').textContent;
            if (!ubicacion || mesaUbicacion.includes(ubicacion)) {
                mesa.style.display = 'block';
            } else {
                mesa.style.display = 'none';
            }
        });
    }

    openPedidoModal(mesa) {
        // Implementar lógica para abrir modal de pedido
        alert(`Abriendo pedido para ${mesa.nombre}. Esta funcionalidad se conectará al backend.`);
    }

    closeModal(modal) {
        modal.style.display = 'none';
    }

    openModal(modalId) {
        document.getElementById(modalId).style.display = 'block';
    }

    showError(message) {
        // Implementar notificación de error
        console.error(message);
        alert(message);
    }

    showNotification(message, type = 'success') {
        // Implementar notificaciones toast
        console.log(message);
    }
}

// Inicializar la aplicación cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    window.app = new AppMeseros();
});