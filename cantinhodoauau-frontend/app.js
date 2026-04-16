const API_BASE = 'http://localhost:8000';

let currentSection = 'clients';
let allData = [];

document.addEventListener('DOMContentLoaded', () => {
    fetchStats();
    showSection('clients');
});

async function fetchStats() {
    try {
        const clients = await fetch(`${API_BASE}/clients/`).then(r => r.json());
        const hotel = await fetch(`${API_BASE}/hotel/stays`).then(r => r.json());
        
        allData = clients;
        document.getElementById('count-pets').textContent = clients.length;
        document.getElementById('count-hotel').textContent = hotel.length;
        
        // Simulating vaccine check (V10 or Gripe missing)
        const pending = clients.filter(c => !c.last_v10 || !c.last_gripe).length;
        document.getElementById('count-pending').textContent = pending;
        
        if(currentSection === 'clients') renderClients(clients);
    } catch (e) {
        console.error('API Error:', e);
    }
}

function showSection(section) {
    currentSection = section;
    const title = document.getElementById('section-title');
    const navItems = document.querySelectorAll('nav li');
    navItems.forEach(li => li.classList.remove('active'));
    
    if (section === 'clients') {
        title.innerText = 'Clientes & Pets';
        navItems[0].classList.add('active');
        renderClients(allData);
    } else if (section === 'hotel') {
        title.innerText = 'Monitor de Hospedagem';
        navItems[1].classList.add('active');
        fetchHotel();
    } else if (section === 'vaccines') {
        title.innerText = 'Controle Sanitário';
        navItems[2].classList.add('active');
        renderVaccines();
    } else if (section === 'logs') {
        title.innerText = 'Logs de Auditoria';
        navItems[3].classList.add('active');
        fetchLogs();
    }
}

function renderClients(clients) {
    const container = document.getElementById('data-container');
    container.innerHTML = clients.map(client => `
        <div class="pet-card animate-fade" onclick="viewPet('${client.id}')">
            <img src="${client.photo || 'https://images.unsplash.com/photo-1543466835-00a732f3804c?w=100'}" alt="Pet">
            <h4>${client.name}</h4>
            <p class="breed">${client.breed || 'SRD'}</p>
            <div style="display: flex; gap: 5px;">
                <span class="vaccine-badge ${client.last_v10 ? 'badge-ok' : 'badge-danger'}">V10</span>
                <span class="vaccine-badge ${client.last_gripe ? 'badge-ok' : 'badge-danger'}">Gripe</span>
            </div>
            <div style="margin-top: 1rem; font-size: 0.8rem; color: var(--text-secondary)">
                Tutor: ${client.tutor_name || 'N/A'}
            </div>
        </div>
    `).join('');
}

// UI Helpers
function openAddModal() {
    document.getElementById('client-form').reset();
    document.getElementById('photo-preview').style.display = 'none';
    document.getElementById('photo-label').style.display = 'block';
    document.getElementById('modal-add').style.display = 'flex';
    switchTab(document.querySelector('.tabs-trigger'), 'tab-pet');
}

function closeModal(id) {
    document.getElementById(id).style.display = 'none';
}

function switchTab(el, tabId) {
    document.querySelectorAll('.tabs-trigger').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    el.classList.add('active');
    document.getElementById(tabId).classList.add('active');
}

function previewPhoto(input) {
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = (e) => {
            document.getElementById('photo-preview').src = e.target.result;
            document.getElementById('photo-preview').style.display = 'block';
            document.getElementById('photo-label').style.display = 'none';
        };
        reader.readAsDataURL(input.files[0]);
    }
}

async function handleFormSubmit(e) {
    e.preventDefault();
    
    const clientData = {
        name: document.getElementById('f-name').value,
        breed: document.getElementById('f-breed').value,
        pet_size: document.getElementById('f-size').value,
        gender: document.getElementById('f-gender').value,
        weight: parseFloat(document.getElementById('f-weight').value) || 0,
        birth_date: document.getElementById('f-birth').value ? new Date(document.getElementById('f-birth').value).toISOString() : null,
        castrated: document.getElementById('f-castrated').checked,
        
        tutor_name: document.getElementById('f-tutor-name').value,
        tutor_cpf: document.getElementById('f-tutor-cpf').value,
        tutor_phone: document.getElementById('f-tutor-phone').value,
        tutor_email: document.getElementById('f-tutor-email').value,
        tutor_address: document.getElementById('f-tutor-address').value,
        tutor_neighborhood: document.getElementById('f-tutor-neighborhood').value,
        
        // Dates (denormalized in backend)
        last_v10: document.getElementById('f-v10').value ? new Date(document.getElementById('f-v10').value).toISOString() : null,
        last_gripe: document.getElementById('f-gripe').value ? new Date(document.getElementById('f-gripe').value).toISOString() : null,
        last_raiva: document.getElementById('f-raiva').value ? new Date(document.getElementById('f-raiva').value).toISOString() : null,
        last_giardia: document.getElementById('f-giardia').value ? new Date(document.getElementById('f-giardia').value).toISOString() : null,
        last_antipulgas: document.getElementById('f-antipulgas').value ? new Date(document.getElementById('f-antipulgas').value).toISOString() : null,
        
        photo: document.getElementById('photo-preview').src || null
    };

    try {
        const res = await fetch(`${API_BASE}/clients/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(clientData)
        });

        if (res.ok) {
            alert('Cadastro realizado com sucesso!');
            closeModal('modal-add');
            fetchStats(); // Refresh list
        } else {
            const err = await res.json();
            alert('Erro ao salvar: ' + JSON.stringify(err.detail));
        }
    } catch (err) {
        alert('Erro de conexão com o servidor.');
    }
}

function viewPet(id) {
    const client = allData.find(c => c.id === id);
    if(!client) return;
    
    document.getElementById('view-title').innerText = client.name;
    document.getElementById('view-body').innerHTML = `
        <div style="display: flex; gap: 20px; align-items: start;">
            <img src="${client.photo || 'https://images.unsplash.com/photo-1543466835-00a732f3804c?w=200'}" style="width: 120px; height: 120px; border-radius: 20px; object-fit: cover; border: 2px solid var(--primary)">
            <div>
                <p><strong>Raça:</strong> ${client.breed || 'SRD'}</p>
                <p><strong>Peso:</strong> ${client.weight || '?'} kg</p>
                <p><strong>Porte:</strong> ${client.pet_size}</p>
                <p><strong>Gênero:</strong> ${client.gender}</p>
            </div>
        </div>
        <div style="margin-top: 1.5rem; background: var(--bg-dark); padding: 15px; border-radius: 12px;">
            <p style="color: var(--primary); font-weight: 700; margin-bottom: 5px;">TUTOR</p>
            <p><strong>Nome:</strong> ${client.tutor_name || 'N/A'}</p>
            <p><strong>Telefone:</strong> ${client.tutor_phone || 'N/A'}</p>
        </div>
    `;
    document.getElementById('modal-view').style.display = 'flex';
}

// Other fetchers...
async function fetchHotel() {
    const stays = await fetch(`${API_BASE}/hotel/stays`).then(r => r.json());
    document.getElementById('data-container').innerHTML = stays.map(stay => `
        <div class="pet-card" style="border-left: 4px solid var(--secondary)">
            <h4>${stay.dog_name}</h4>
            <p class="breed">Check-in: ${new Date(stay.check_in).toLocaleDateString()}</p>
        </div>
    `).join('') || '<p>Nenhum pet hospedado.</p>';
}

async function fetchLogs() {
    const logs = await fetch(`${API_BASE}/logs/`).then(r => r.json());
    document.getElementById('data-container').innerHTML = `
        <div style="width:100%; overflow-x:auto">
            <table style="width:100%; text-align:left; border-collapse:collapse">
                ${logs.map(l => `<tr style="border-bottom:1px solid var(--border)"><td style="padding:10px">${l.action}</td><td>${l.user_name}</td><td>${new Date(l.created_at).toLocaleString()}</td></tr>`).join('')}
            </table>
        </div>
    `;
}
