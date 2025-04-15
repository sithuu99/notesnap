let editingNoteIndex = null;
const urlParams = new URLSearchParams(window.location.search);
const isNewNote = urlParams.get('newNote') === 'true';
const predefinedColors = ['#FF6B6B', '#6BCB77', '#4D96FF', '#FFC300', '#B983FF', '#FF8C42'];


// Load everything when popup opens
document.addEventListener('DOMContentLoaded', () => {
  if (isNewNote) {
    showNewNoteForm();

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
      // Clear after using
      chrome.storage.local.remove(['quickNoteText', 'quickNoteUrl', 'quickNoteTitle']);
    });
  } else {
    loadNotes(); // This is your dashboard loader
  }

  loadCategories();
  
  document.getElementById('delete-note').addEventListener('click', deleteNote);
  document.getElementById('new-note').addEventListener('click', () => showNewNoteForm());
  document.getElementById('save-note').addEventListener('click', saveNote);
  document.getElementById('summarize-btn').addEventListener('click', summarizeNoteText);
  document.getElementById('add-category-btn').addEventListener('click', addNewCategory);
  document.getElementById('delete-category-btn').addEventListener('click', deleteCategory);
});

function showNewNoteForm(note = null, index = null) {
  document.getElementById('main-screen').style.display = 'none';
  document.getElementById('new-note-screen').style.display = 'block';

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
  document.getElementById('new-note-screen').style.display = 'none';
  document.getElementById('main-screen').style.display = 'block';
  loadNotes();
}

function loadNotes() {
  chrome.storage.local.get({ notes: [], categories: ['Uncategorized'], categoryColors: {} }, (result) => {
    const container = document.getElementById('notes-container');
    container.innerHTML = '';

    result.categories.forEach(category => {
      if (category === 'Uncategorized') return;

      const categoryWrapper = document.createElement('div');
      categoryWrapper.className = 'category-wrapper';

      // 🔧 Create the flex container for color bar + category content
      const categoryBlock = document.createElement('div');
      categoryBlock.className = 'category-block';

      const colorBar = document.createElement('div');
      colorBar.className = 'color-bar';
      colorBar.style.backgroundColor = result.categoryColors[category] || '#ccc';

      const innerWrapper = document.createElement('div');
      innerWrapper.className = 'category-inner-wrapper';

      const categoryHeader = document.createElement('div');
      categoryHeader.className = 'category-header';

      const titleSpan = document.createElement('span');
      titleSpan.className = 'category-title-text';
      titleSpan.textContent = category;

      categoryHeader.appendChild(titleSpan);

      const notesList = document.createElement('div');
      notesList.className = 'notes-list collapse';

      result.notes
        .filter(note => note.category === category)
        .forEach((note, index) => {
          const noteItem = document.createElement('div');
          noteItem.className = 'note-item';
          noteItem.innerHTML = `
            <span class="note-title-text">${note.title || 'Untitled'}</span>
            <button class="edit-note-btn" data-index="${index}">✎</button>
          `;
          noteItem.querySelector('button').addEventListener('click', (e) => {
            e.stopPropagation();
            showNewNoteForm(note, index);
          });
          notesList.appendChild(noteItem);
        });

      categoryHeader.addEventListener('click', () => {
        const isExpanded = notesList.classList.contains('expanded');

        if (isExpanded) {
          notesList.style.maxHeight = notesList.scrollHeight + 'px';
          requestAnimationFrame(() => {
            notesList.style.maxHeight = '0';
          });
        } else {
          notesList.style.maxHeight = notesList.scrollHeight + 'px';
        }

        notesList.classList.toggle('expanded');
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
  const category = document.getElementById('category').value || 'Uncategorized';
  const title = document.getElementById('title').value || 'Untitled';
  const website = document.getElementById('website').value || '';
  const noteText = document.getElementById('note').value || '';
  const summarizedText = document.getElementById('summarized-text').value || '';

  if (!noteText.trim()) {
    alert('Please enter a note!');
    return;
  }

  const newNote = { category, title, website, text: noteText, summarizedText };

  chrome.storage.local.get({ notes: [] }, (result) => {
    const notes = result.notes;

    if (editingNoteIndex !== null) {
      notes[editingNoteIndex] = newNote;
    } else {
      notes.push(newNote);
    }

    chrome.storage.local.set({ notes }, () => {
      backToMainScreen();
    });
  });
}

function summarizeNoteText() {
  const noteText = document.getElementById('note').value;

  if (!noteText.trim()) {
    alert('Please write a note first!');
    return;
  }

  callOpenAISummarize(noteText)
    .then(summary => {
      document.getElementById('summarized-text').value = summary;
    })
    .catch(err => {
      console.error('Summarization failed', err);
      alert('Summarization failed. Check console.');
    });
}

async function callOpenAISummarize(text) {
  const response = await fetch('https://notesnap-backend.onrender.com/summarize', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text })
  });

  const data = await response.json();
  return data.summary.trim();
}


function addNewCategory() {
  const newCategory = prompt('Enter new category name:');
  if (newCategory) {
    chrome.storage.local.get({ categories: ['Uncategorized'], categoryColors: {} }, (result) => {
      const { categories, categoryColors } = result;

      if (!categories.includes(newCategory)) {
        categories.push(newCategory);

        // Assign a random color
        const randomColor = predefinedColors[Math.floor(Math.random() * predefinedColors.length)];
        categoryColors[newCategory] = randomColor;

        chrome.storage.local.set({ categories, categoryColors }, () => {
          loadCategories();
          document.getElementById('category').value = newCategory;
        });
      } else {
        alert('Category already exists!');
      }
    });
  }
}


function loadCategories() {
  chrome.storage.local.get({ categories: ['Uncategorized'] }, (result) => {
    const select = document.getElementById('category');
    select.innerHTML = '';

    result.categories.forEach(cat => {
      const option = document.createElement('option');
      option.value = cat;
      option.text = cat;
      select.appendChild(option);
    });
  });
}

function deleteNote() {
  if (editingNoteIndex === null) {
    alert('No note selected to delete!');
    return;
  }

  if (confirm('Are you sure you want to delete this note?')) {
    chrome.storage.local.get({ notes: [] }, (result) => {
      const notes = result.notes;
      notes.splice(editingNoteIndex, 1);
      chrome.storage.local.set({ notes }, () => {
        backToMainScreen();
      });
    });
  }
}

function deleteCategory() {
  const categoryToDelete = document.getElementById('category').value;

  if (categoryToDelete === 'Uncategorized') {
    alert('Cannot delete the "Uncategorized" category!');
    return;
  }

  if (confirm(`Are you sure you want to delete category "${categoryToDelete}"?`)) {
    chrome.storage.local.get({ categories: ['Uncategorized'] }, (result) => {
      const categories = result.categories.filter(cat => cat !== categoryToDelete);
      chrome.storage.local.set({ categories }, () => {
        loadCategories();
      });
    });

    // Update notes that had this category
    chrome.storage.local.get({ notes: [] }, (result) => {
      const notes = result.notes.map(note => {
        if (note.category === categoryToDelete) {
          note.category = 'Uncategorized';
        }
        return note;
      });
      chrome.storage.local.set({ notes });
    });
  }
}
