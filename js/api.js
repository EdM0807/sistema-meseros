// Configuración de la API - ESTA URL LA ACTUALIZAREMOS DESPUÉS
const API_BASE_URL = 'https://tu-app.onrender.com';
class ApiService {
    constructor() {
        this.baseUrl = API_BASE_URL;
    }

    async request(endpoint, options = {}) {
        const url = `${this.baseUrl}${endpoint}`;
        
        try {
            const response = await fetch(url, {
                headers: {
                    'Content-Type': 'application/json',
                    ...options.headers
                },
                ...options
            });

            if (!response.ok) {
                throw new Error(`Error ${response.status}: ${response.statusText}`);
            }

            return await response.json();
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    }

    // Mesas
    async getMesas() {
        return this.request('/api/mesas');
    }

    async getMesasLibres() {
        return this.request('/api/mesas/libres');
    }

    // Productos
    async getProductos() {
        return this.request('/api/productos');
    }

    async getProductosPorCategoria(categoriaId) {
        return this.request(`/api/productos/categoria/${categoriaId}`);
    }

    // Categorías
    async getCategorias() {
        return this.request('/api/categorias');
    }

    // Pedidos
    async crearPedido(pedidoData) {
        return this.request('/api/pedidos', {
            method: 'POST',
            body: JSON.stringify(pedidoData)
        });
    }

    async getPedidosPorMesa(mesaId) {
        return this.request(`/api/pedidos/mesa/${mesaId}`);
    }

    async getPedidosActivos() {
        return this.request('/api/pedidos/activos');
    }
}

// Instancia global de la API
window.api = new ApiService();
