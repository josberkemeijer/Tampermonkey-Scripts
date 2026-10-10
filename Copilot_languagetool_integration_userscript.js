// ==UserScript==
// @name         Copilot LanguageTool Native Trigger v5.0
// @namespace    http://tampermonkey.net/
// @version      5.0
// @description  Forseert HTML-attributen en events op Copilot inputbox zodat de officiële LanguageTool extensie het herkent.
// @match        https://copilot.microsoft.com/*
// @match        https://*.copilot.microsoft.com/*
// @match        https://copilot.com/*
// @match        https://*.copilot.com/*
// @run-at       document-idle
// ==/UserScript==

(function() {
    'use strict';

    // Functie om diep in Shadow DOM te zoeken naar het echte tekstveld
    function findInputArea(root = document) {
        // Directe matches in licht DOM
        let el = root.querySelector('textarea, [contenteditable="true"], [role="textbox"], #aria-web-editor-input, [data-lexical-editor="true"]');
        if (el) return el;

        // Zoek door Shadow DOMs heen
        const allElements = root.querySelectorAll('*');
        for (const node of allElements) {
            if (node.shadowRoot) {
                const found = findInputArea(node.shadowRoot);
                if (found) return found;
            }
        }
        return null;
    }

    function enableLanguageToolNative() {
        const inputEl = findInputArea();
        if (!inputEl) return;

        // 1. Dwing de vereiste HTML attributen af voor LT-detectie
        if (inputEl.getAttribute('spellcheck') !== 'true') {
            inputEl.setAttribute('spellcheck', 'true');
        }
        if (!inputEl.getAttribute('lang')) {
            inputEl.setAttribute('lang', 'nl'); // Of navigator.language
        }
        
        // Zorg dat het element herkenbaar is als editable
        inputEl.setAttribute('data-gramm', 'true'); // Sommige checkers herkennen dit
        inputEl.setAttribute('data-lt-active', 'true');
        
        // Indien het een div/contenteditable is:
        if (!inputEl.hasAttribute('contenteditable') && inputEl.tagName !== 'TEXTAREA' && inputEl.tagName !== 'INPUT') {
            inputEl.setAttribute('contenteditable', 'true');
        }

        // 2. Maak de overkoepelende container herkenbaar voor extensies
        const parentForm = inputEl.closest('form') || inputEl.parentElement;
        if (parentForm && !parentForm.dataset.ltFormMarked) {
            parentForm.dataset.ltFormMarked = "true";
            // Zorg dat de container niet als 'geheim/password/code' gemarkeerd staat
            parentForm.removeAttribute('autocomplete');
        }

        // 3. Stuur nep-events zodat LT weet dat de cursor in dit veld staat
        if (!inputEl.dataset.ltListenersAttached) {
            inputEl.dataset.ltListenersAttached = "true";
            
            const triggerLtNotice = () => {
                // Informeer extensies via een standaard input/focus event
                inputEl.dispatchEvent(new Event('input', { bubbles: true }));
                document.dispatchEvent(new CustomEvent('languagetool:check', { detail: { element: inputEl } }));
            };

            inputEl.addEventListener('focus', triggerLtNotice);
            inputEl.addEventListener('click', triggerLtNotice);
            inputEl.addEventListener('keyup', triggerLtNotice);
        }
    }

    // Monitor continue veranderingen in de DOM (Copilot bouwt de editor vaak opnieuw op)
    const observer = new MutationObserver(() => {
        enableLanguageToolNative();
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['spellcheck', 'contenteditable']
    });

    // Extra fallback interval voor snelle herstellingen
    setInterval(enableLanguageToolNative, 800);
})();