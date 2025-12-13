import { db } from './firebaseConfig.js';
import { doc, updateDoc, getDoc, setDoc } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

// Função para salvar zona
export async function saveZone(zoneData) {
  try {
    const docRef = doc(db, 'configuracoes', 'zones');
    const docSnap = await getDoc(docRef);

    const newZone = {
      nome: zoneData.nome || 'zona1',
      x: parseInt(zoneData.x),
      y: parseInt(zoneData.y),
      width: parseInt(zoneData.width),
      height: parseInt(zoneData.height),
      created_at: new Date().toISOString()
    };

    if (docSnap.exists()) {
      const existingData = docSnap.data();
      const existingZones = Array.isArray(existingData.zones) ? existingData.zones : [];
      
      // Substitui a primeira zona ou adiciona nova
      if (existingZones.length > 0) {
        existingZones[0] = newZone;
      } else {
        existingZones.push(newZone);
      }

      await updateDoc(docRef, {
        zones: existingZones,
        lastUpdated: new Date().toISOString()
      });
    } else {
      // Caso o documento ainda não exista
      await setDoc(docRef, {
        zones: [newZone],
        lastUpdated: new Date().toISOString()
      });
    }

    return { success: true, message: 'Zona salva com sucesso!' };
  } catch (error) {
    console.error("Erro ao salvar zona:", error);
    return { success: false, message: "Erro ao salvar: " + error.message };
  }
}

// Função para carregar zonas existentes
export async function loadZones() {
  try {
    const docRef = doc(db, 'configuracoes', 'zones');
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const data = docSnap.data();
      return {
        success: true,
        zones: data.zones || [],
        lastUpdated: data.lastUpdated
      };
    } else {
      return {
        success: true,
        zones: [],
        lastUpdated: null
      };
    }
  } catch (error) {
    console.error("Erro ao carregar zonas:", error);
    return {
      success: false,
      message: "Erro ao carregar zonas: " + error.message,
      zones: []
    };
  }
}

// Função para deletar todas as zonas
export async function clearAllZones() {
  try {
    const docRef = doc(db, 'configuracoes', 'zones');
    
    await setDoc(docRef, {
      zones: [],
      lastUpdated: new Date().toISOString()
    });

    return { success: true, message: 'Todas as zonas foram removidas!' };
  } catch (error) {
    console.error("Erro ao limpar zonas:", error);
    return { success: false, message: "Erro ao limpar zonas: " + error.message };
  }
}

// Função para validar dados da zona
export function validateZoneData(zoneData) {
  const errors = [];

  if (!zoneData.x || isNaN(zoneData.x) || zoneData.x < 0) {
    errors.push("Coordenada X deve ser um número válido maior ou igual a 0");
  }

  if (!zoneData.y || isNaN(zoneData.y) || zoneData.y < 0) {
    errors.push("Coordenada Y deve ser um número válido maior ou igual a 0");
  }

  if (!zoneData.width || isNaN(zoneData.width) || zoneData.width <= 0) {
    errors.push("Largura deve ser um número válido maior que 0");
  }

  if (!zoneData.height || isNaN(zoneData.height) || zoneData.height <= 0) {
    errors.push("Altura deve ser um número válido maior que 0");
  }

  return {
    isValid: errors.length === 0,
    errors: errors
  };
}

// Event listener para formulário manual (se existir)
document.addEventListener('DOMContentLoaded', function() {
  const saveZoneBtn = document.getElementById('saveZone');
  
  if (saveZoneBtn) {
    saveZoneBtn.addEventListener('click', async () => {
      const zoneData = {
        x: document.getElementById('xInput')?.value,
        y: document.getElementById('yInput')?.value,
        width: document.getElementById('widthInput')?.value,
        height: document.getElementById('heightInput')?.value,
        nome: document.getElementById('nomeInput')?.value || 'zona1'
      };

      // Validar dados
      const validation = validateZoneData(zoneData);
      if (!validation.isValid) {
        console.warn('Erro de validação:', validation.errors.join('\n'));
        return;
      }

      // Salvar zona
      const result = await saveZone(zoneData);
      
      if (result.success) {
        console.log(result.message);
        // Limpar formulário se existir
        ['xInput', 'yInput', 'widthInput', 'heightInput', 'nomeInput'].forEach(id => {
          const element = document.getElementById(id);
          if (element) element.value = '';
        });
      } else {
        console.error(result.message);
      }
    });
  }

  // Event listener para botão de limpar zonas (se existir)
  const clearZonesBtn = document.getElementById('clearZones');
  if (clearZonesBtn) {
    clearZonesBtn.addEventListener('click', async () => {
      if (confirm('Tem certeza que deseja remover todas as zonas? Esta ação não pode ser desfeita.')) {
        const result = await clearAllZones();
        if (result.success) {
            console.log(result.message);
        } else {
            console.error(result.message);
        }
      }
    });
  }

  // Event listener para carregar zonas (se existir)
  const loadZonesBtn = document.getElementById('loadZones');
  if (loadZonesBtn) {
    loadZonesBtn.addEventListener('click', async () => {
      const result = await loadZones();
      
      if (result.success) {
        // Exibir zonas em uma div
        const zonesDisplay = document.getElementById('zonesDisplay');
        if (zonesDisplay) {
          if (result.zones.length === 0) {
            zonesDisplay.innerHTML = '<p>Nenhuma zona configurada.</p>';
          } else {
            const zonesHtml = result.zones.map((zone, index) => `
              <div class="zone-item">
                <h4>Zona ${index + 1}: ${zone.nome}</h4>
                <p>X: ${zone.x}, Y: ${zone.y}</p>
                <p>Largura: ${zone.width}, Altura: ${zone.height}</p>
                <p>Criada em: ${new Date(zone.created_at).toLocaleString()}</p>
              </div>
            `).join('');
            zonesDisplay.innerHTML = zonesHtml;
          }
        }
        console.log(`${result.zones.length} zona(s) carregada(s) com sucesso!`);
      } else {
        console.error(result.message);
      }
    });
  }
});
