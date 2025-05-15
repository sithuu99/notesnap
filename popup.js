let editingNoteIndex = null;
const urlParams = new URLSearchParams(window.location.search);
const isNewNote = urlParams.get('newNote') === 'true';
const predefinedColors = ['#FF6B6B', '#6BCB77', '#4D96FF', '#FFC300', '#B983FF', '#FF8C42'];

document.addEventListener('DOMContentLoaded', () => {
  const mainScreen = document.getElementById('main-screen');
  const newNoteScreen = document.getElementById('new-note-screen');

  if (isNewNote) {
    mainScreen.classList.add('hidden');
    newNoteScreen.classList.remove('hidden');
    showNewNoteForm(null);

    chrome.storage.local.get(['quickNoteText', 'quickNoteUrl', 'quickNoteTitle'], (result) => {
      if (result.quickNoteText) {
        document.getElementById('note').value = result.quickNoteText;
      }
      if (result.quickNoteUrl) {
        document.getElementById('website').value = result.quickNoteUrl;
      }
      if (result.quickNoteTitle) {
        document.getElementById('title').value = result.quickNoteTitle;
      }
      chrome.storage.local.remove(['quickNoteText', 'quickNoteUrl', 'quickNoteTitle']);
    });
  } else {
    mainScreen.classList.remove('hidden');
    newNoteScreen.classList.add('hidden');
    loadNotes();
  }

  loadCategories();

  document.getElementById('delete-note').addEventListener('click', deleteNote);
  document.getElementById('new-note').addEventListener('click', () => showNewNoteForm());
  document.getElementById('save-note').addEventListener('click', saveNote);
  document.getElementById('export-pdf-btn').addEventListener('click', exportNoteAsPDF);
  document.getElementById('summarize-btn').addEventListener('click', summarizeNoteText);
  document.getElementById('add-category-btn').addEventListener('click', addNewCategory);
  document.getElementById('delete-category-btn').addEventListener('click', deleteCategory);
});

function showNewNoteForm(note = null, index = null) {
  const mainScreen = document.getElementById('main-screen');
  const newNoteScreen = document.getElementById('new-note-screen');

  mainScreen.classList.add('hidden');
  newNoteScreen.classList.remove('hidden');
  newNoteScreen.scrollTop = 0;


  document.getElementById('category').value = 'Uncategorized';
  document.getElementById('title').value = '';
  document.getElementById('website').value = '';
  document.getElementById('note').value = '';
  document.getElementById('summarized-text').value = '';

  if (note) {
    document.getElementById('category').value = note.category || 'Uncategorized';
    document.getElementById('title').value = note.title || '';
    document.getElementById('website').value = note.website || '';
    document.getElementById('note').value = note.text || '';
    document.getElementById('summarized-text').value = note.summarizedText || '';
    editingNoteIndex = index;
  } else {
    editingNoteIndex = null;
  }
}

function backToMainScreen() {
  const mainScreen = document.getElementById('main-screen');
  const newNoteScreen = document.getElementById('new-note-screen');

  newNoteScreen.classList.add('hidden');
  mainScreen.classList.remove('hidden');
  mainScreen.scrollTop = 0;
  loadNotes();
}

function loadNotes() {
  chrome.storage.local.get({ notes: [], categories: ['Uncategorized'], categoryColors: {} }, (result) => {
    const container = document.getElementById('notes-container');
    container.innerHTML = '';

    result.categories.forEach(category => {
      if (category === 'Uncategorized') return;

      const notesInCategory = result.notes.filter((note, index) => {
          note.originalIndex = index;
          return note.category === category;
      });

      if (notesInCategory.length === 0) return;


      const categoryWrapper = document.createElement('div');
      categoryWrapper.className = 'category-wrapper';

      const categoryBlock = document.createElement('div');
      categoryBlock.className = 'category-block';

      const colorBar = document.createElement('div');
      colorBar.className = 'color-bar';
      colorBar.style.backgroundColor = result.categoryColors[category] || predefinedColors[result.categories.indexOf(category) % predefinedColors.length] || '#ccc';


      const innerWrapper = document.createElement('div');
      innerWrapper.className = 'category-inner-wrapper';

      const categoryHeader = document.createElement('div');
      categoryHeader.className = 'category-header';

      const titleSpan = document.createElement('span');
      titleSpan.className = 'category-title-text';
      titleSpan.textContent = category;

      const expandIcon = document.createElement('span');
      expandIcon.className = 'expand-icon';
      expandIcon.innerHTML = '&#9654;';

      categoryHeader.appendChild(titleSpan);
      categoryHeader.appendChild(expandIcon);

      const notesList = document.createElement('div');
      notesList.className = 'notes-list';

      notesInCategory.forEach((note) => {
        const noteItem = document.createElement('div');
        noteItem.className = 'note-item';
        noteItem.innerHTML = `
          <span class="note-title-text" title="${note.title || 'Untitled'}">${note.title || 'Untitled'}</span>
          <button class="edit-note-btn" data-index="${note.originalIndex}">✎</button>
        `;
        noteItem.querySelector('button.edit-note-btn').addEventListener('click', (e) => {
          e.stopPropagation();
          const originalNote = result.notes[note.originalIndex];
          showNewNoteForm(originalNote, note.originalIndex);
        });
        notesList.appendChild(noteItem);
      });

      categoryHeader.addEventListener('click', () => {
          const isExpanded = notesList.classList.contains('expanded');
          categoryHeader.classList.toggle('expanded');
          notesList.classList.toggle('expanded');

          if (!isExpanded) {
              notesList.style.maxHeight = notesList.scrollHeight + 'px';
          } else {
              notesList.style.maxHeight = notesList.scrollHeight + 'px';
              requestAnimationFrame(() => {
                 requestAnimationFrame(() => {
                    notesList.style.maxHeight = '0';
                 });
              });
          }
      });

      innerWrapper.appendChild(categoryHeader);
      innerWrapper.appendChild(notesList);
      categoryBlock.appendChild(colorBar);
      categoryBlock.appendChild(innerWrapper);
      categoryWrapper.appendChild(categoryBlock);
      container.appendChild(categoryWrapper);
    });
  });
}


function saveNote() {
  const category = document.getElementById('category').value;
  const title = document.getElementById('title').value.trim() || 'Untitled';
  const website = document.getElementById('website').value.trim();
  const noteText = document.getElementById('note').value.trim();
  const summarizedText = document.getElementById('summarized-text').value.trim();

  if (category === 'Uncategorized') {
    alert('Please choose a category for your note.');
    return;
  }

  if (!noteText && !title) {
    alert('Please enter at least a title or a note!');
    return;
  }

  const newNote = { category, title, website, text: noteText, summarizedText };

  chrome.storage.local.get({ notes: [], categories: ['Uncategorized'], categoryColors: {} }, (result) => {
    let { notes, categories, categoryColors } = result;

    if (!categories.includes(category)) {
        categories.push(category);
        if (!categoryColors[category]) {
            const usedColors = Object.values(categoryColors);
            let availableColors = predefinedColors.filter(c => !usedColors.includes(c));
            if (availableColors.length === 0) availableColors = predefinedColors;
            categoryColors[category] = availableColors[Math.floor(Math.random() * availableColors.length)];
        }
    }


    if (editingNoteIndex !== null && editingNoteIndex >= 0 && editingNoteIndex < notes.length) {
      notes[editingNoteIndex] = newNote;
    } else {
      notes.push(newNote);
    }

    chrome.storage.local.set({ notes, categories, categoryColors }, () => {
      backToMainScreen();
    });
  });
}

function summarizeNoteText() {
  const noteText = document.getElementById('note').value;
  const summarizeBtn = document.getElementById('summarize-btn');
  const summarizedTextArea = document.getElementById('summarized-text');

  if (!noteText.trim()) {
    alert('Please write a note first to summarize!');
    return;
  }

  summarizeBtn.disabled = true;
  summarizeBtn.textContent = 'Summarizing...';
  summarizedTextArea.value = 'Generating summary...';


  callOpenAISummarize(noteText)
    .then(summary => {
      summarizedTextArea.value = summary;
    })
    .catch(err => {
      console.error('Summarization failed', err);
      alert('Summarization failed. Please check the console for details.');
      summarizedTextArea.value = 'Error during summarization.';
    })
    .finally(() => {
      summarizeBtn.disabled = false;
      summarizeBtn.textContent = 'Click to summarize';
    });
}

async function callOpenAISummarize(text) {
  const response = await fetch('https://notesnap-fi9fu.ondigitalocean.app/summarize', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text })
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    console.error("Server responded with error:", response.status, errorData);
    throw new Error(`Server error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();

  if (!data.summary) {
     console.error("Invalid summary response from server:", data);
     throw new Error('Received invalid summary format from server.');
  }
  return data.summary.trim();
}


function addNewCategory() {
  const newCategory = prompt('Enter new category name:');
  if (newCategory && newCategory.trim()) {
    const trimmedCategory = newCategory.trim();
    if (trimmedCategory.toLowerCase() === 'uncategorized') {
        alert('You cannot add "Uncategorized" as a new category name.');
        return;
    }
    chrome.storage.local.get({ categories: ['Uncategorized'], categoryColors: {} }, (result) => {
      const { categories, categoryColors } = result;

      if (!categories.map(c => c.toLowerCase()).includes(trimmedCategory.toLowerCase())) {
        categories.push(trimmedCategory);
         const usedColors = Object.values(categoryColors);
         let availableColors = predefinedColors.filter(c => !usedColors.includes(c));
         if (availableColors.length === 0) availableColors = predefinedColors;
         const randomColor = availableColors[Math.floor(Math.random() * availableColors.length)];
         categoryColors[trimmedCategory] = randomColor;

        chrome.storage.local.set({ categories, categoryColors }, () => {
          loadCategories();
          document.getElementById('category').value = trimmedCategory;
        });
      } else {
        alert(`Category "${trimmedCategory}" already exists!`);
      }
    });
  }
}


function loadCategories() {
  chrome.storage.local.get({ categories: ['Uncategorized'] }, (result) => {
    const select = document.getElementById('category');
    const currentVal = select.value;
    select.innerHTML = '';

    let SBaseCategories = result.categories;
    if (!SBaseCategories.includes('Uncategorized')) {
        SBaseCategories.unshift('Uncategorized');
    }
    
    let sortedCategories = ['Uncategorized', ...SBaseCategories.filter(c => c !== 'Uncategorized')];


    sortedCategories.forEach(cat => {
      const option = document.createElement('option');
      option.value = cat;
      option.textContent = cat;
      select.appendChild(option);
    });

    if (sortedCategories.includes(currentVal)) {
        select.value = currentVal;
    } else {
        select.value = 'Uncategorized';
    }
  });
}

function deleteNote() {
  if (editingNoteIndex === null || editingNoteIndex < 0) {
    alert('No note is currently selected for deletion.');
     backToMainScreen();
    return;
  }

  if (confirm('Are you sure you want to delete this note? This action cannot be undone.')) {
    chrome.storage.local.get({ notes: [] }, (result) => {
      const notes = result.notes;
      if (editingNoteIndex < notes.length) {
          notes.splice(editingNoteIndex, 1);
          chrome.storage.local.set({ notes }, () => {
            editingNoteIndex = null;
            backToMainScreen();
          });
      } else {
          console.error("Error deleting note: editingNoteIndex out of bounds.");
          alert("An error occurred while trying to delete the note. Please try again.");
           backToMainScreen();
      }
    });
  }
}

function deleteCategory() {
  const categorySelect = document.getElementById('category');
  const categoryToDelete = categorySelect.value;

  if (!categoryToDelete || categoryToDelete === 'Uncategorized') {
    alert('You cannot delete the "Uncategorized" category.');
    return;
  }

  if (confirm(`Are you sure you want to delete the category "${categoryToDelete}"? All notes within this category will be moved to "Uncategorized".`)) {
    chrome.storage.local.get({ notes: [], categories: ['Uncategorized'], categoryColors: {} }, (result) => {
      let { notes, categories, categoryColors } = result;

      const updatedCategories = categories.filter(cat => cat !== categoryToDelete);
      delete categoryColors[categoryToDelete];

      const updatedNotes = notes.map(note => {
        if (note.category === categoryToDelete) {
          return { ...note, category: 'Uncategorized' };
        }
        return note;
      });

      chrome.storage.local.set({ notes: updatedNotes, categories: updatedCategories, categoryColors }, () => {
        loadCategories();
        alert(`Category "${categoryToDelete}" deleted. Associated notes moved to "Uncategorized".`);
         document.getElementById('category').value = 'Uncategorized';
      });
    });
  }
}

function toDataURL(url, callback) {
  var xhr = new XMLHttpRequest();
  xhr.onload = function() {
    var reader = new FileReader();
    reader.onloadend = function() {
      callback(reader.result);
    }
    reader.readAsDataURL(xhr.response);
  };
  xhr.open('GET', url);
  xhr.responseType = 'blob';
  xhr.send();
}

function exportNoteAsPDF() {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  const category = document.getElementById('category').value;
  const title = document.getElementById('title').value.trim() || 'Untitled';
  const website = document.getElementById('website').value.trim();
  const noteText = document.getElementById('note').value.trim();
  const summarizedText = document.getElementById('summarized-text').value.trim();
  
  const logoUrl = chrome.runtime.getURL('icons/icon.png');

  toDataURL(logoUrl, function(logoDataURL) {
    doc.addImage(logoDataURL, 'PNG', 15, 10, 20, 20);
    doc.setFontSize(18);
    doc.text('NoteSnap', 40, 22);
    doc.setFontSize(10);
    doc.setTextColor(150);
    const generationDate = `Exported: ${new Date().toLocaleDateString("en-GB", {day: '2-digit', month: 'short', year: 'numeric'})} ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    doc.text(generationDate, 15, 35);


    doc.setFontSize(16);
    doc.setTextColor(0);
    doc.text(title, 15, 50);

    let yPosition = 60;
    const pageHeight = doc.internal.pageSize.height;
    const bottomMargin = 20;
    const lineHeight = 7;
    const fieldIndent = 15;
    const valueIndent = 40;
    const availableWidth = doc.internal.pageSize.width - fieldIndent - 20;

    function addTextField(label, value) {
      if (yPosition > pageHeight - bottomMargin - (lineHeight * 2)) { // Check for space before adding label
        doc.addPage();
        yPosition = 20;
      }
      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text(label, fieldIndent, yPosition);
      doc.setTextColor(0);
      doc.setFontSize(12);
      
      const textLines = doc.splitTextToSize(value || '-', availableWidth - (valueIndent - fieldIndent));
      textLines.forEach(line => {
        if (yPosition > pageHeight - bottomMargin) {
          doc.addPage();
          yPosition = 20;
        }
        doc.text(line, valueIndent, yPosition);
        yPosition += lineHeight;
      });
      yPosition += lineHeight / 2; 
    }
    
    addTextField('Category:', category);
    if (website) {
      addTextField('Website:', website);
    }
    addTextField('Note:', noteText);
    if (summarizedText) {
      addTextField('Summary:', summarizedText);
    }

    let pdfFileName = title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    if (!pdfFileName || pdfFileName === 'untitled') {
        pdfFileName = 'notesnap_note';
    } else if (pdfFileName.length > 50) {
        pdfFileName = pdfFileName.substring(0, 50);
    }
    doc.save(`${pdfFileName}.pdf`);
  });
}