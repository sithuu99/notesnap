chrome.runtime.onInstalled.addListener(() => {
    chrome.contextMenus.create({
      id: "createNote",
      title: "Create a new note",
      contexts: ["selection"], // Only show when text is selected
    });
  });
  
  chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId === "createNote") {
      const selectedText = info.selectionText;
      const pageUrl = info.pageUrl;
      const pageTitle = tab.title;
  
      chrome.storage.local.set({ 
        quickNoteText: selectedText,
        quickNoteUrl: pageUrl,
        quickNoteTitle: pageTitle
      }, () => {
        chrome.windows.create({
          url: chrome.runtime.getURL('popup.html?newNote=true'),
          type: 'popup',
          width: 400,
          height: 600
        });
      });
    }
  });
  
  