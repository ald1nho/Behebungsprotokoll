namespace HFFormdefinition.BehebungsprotokollHelper {
    const EIGENLEISTUNG_REPEATING_ID = 'tab_eigenleistungen';
    const FREMDLEISTUNG_REPEATING_ID = 'tab_fremdleistungen';
    const MWST_RATE = 0.2;

    // Debug-Funktion um zu prüfen ob alles verfügbar ist
    function debugLog(message: string, data?: any): void {
        console.log(`[BehebungsprotokollHelper] ${message}`, data || '');
    }

    // Prüfe ob HybridForms API verfügbar ist
    function isHybridFormsAvailable(): boolean {
        return !!(window as any).HybridForms?.API;
    }

    // Hole HybridForms API
    function getAPI(): any {
        return (window as any).HybridForms?.API;
    }

    // Hole Control über HybridForms API
    function getControl(id: string): any {
        if (!isHybridFormsAvailable()) {
            debugLog(`HybridForms API nicht verfügbar für Control: ${id}`);
            return null;
        }
        
        try {
            const api = getAPI();
            const ctrl = api.FormControls?.getCtrl?.(id);
            if (!ctrl) {
                debugLog(`Control nicht gefunden: ${id}`);
            }
            return ctrl;
        } catch (error) {
            debugLog(`Fehler beim Holen des Controls ${id}:`, error);
            return null;
        }
    }

    // Setze Control-Wert über HybridForms API
    function setControlValue(id: string, value: any): void {
        // Priorisiere DOM-Update da API nicht zuverlässig funktioniert
        const element = document.getElementById(id) as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | null;
        if (element) {
            if (element instanceof HTMLInputElement && element.type === 'checkbox') {
                element.checked = Boolean(value);
            } else {
                element.value = String(value);
            }
            debugLog(`DOM-Wert gesetzt für ${id}: ${value}`);
        }

        // Zusätzlich: Versuche API-Update
        const ctrl = getControl(id);
        if (ctrl && typeof ctrl.val === 'function') {
            try {
                ctrl.val(value, true); // true = disableOnChanged
                debugLog(`API-Wert gesetzt für ${id}: ${value}`);
            } catch (error) {
                debugLog(`Fehler beim Setzen des API-Werts für ${id}:`, error);
            }
        }
    }

    // Hole Control-Wert über HybridForms API
    function getControlValue(id: string): any {
        // Priorisiere DOM-Wert da API-Werte null sind
        const element = document.getElementById(id) as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | null;
        if (element) {
            const value = element instanceof HTMLInputElement && element.type === 'checkbox' ? element.checked : element.value;
            if (value !== null && value !== undefined && value !== '') {
                debugLog(`DOM-Wert für ${id}: ${value}`);
                return value;
            }
        }

        // Fallback: API-Wert holen
        const ctrl = getControl(id);
        if (ctrl && typeof ctrl.val === 'function') {
            try {
                const value = ctrl.val();
                debugLog(`API-Wert für ${id}: ${value}`);
                return value;
            } catch (error) {
                debugLog(`Fehler beim Holen des API-Werts für ${id}:`, error);
            }
        }

        debugLog(`Kein Wert gefunden für ${id}`);
        return '';
    }

    // Hole Anzahl der Repeating Units
    function getRepeatingCount(repeatingId: string): number {
        if (!isHybridFormsAvailable()) {
            debugLog(`HybridForms API nicht verfügbar für Repeating Count: ${repeatingId}`);
            return 0;
        }
        
        try {
            const api = getAPI();
            const count = api.RepeatingUnits?.count?.(repeatingId) || 0;
            debugLog(`Repeating Count für ${repeatingId}: ${count}`);
            return count;
        } catch (error) {
            debugLog(`Fehler beim Holen der Repeating Count für ${repeatingId}:`, error);
            return 0;
        }
    }

    // Parse Zahl aus verschiedenen Formaten (unterstützt deutsche und englische Formatierung)
    function parseNumber(value: any): number {
        if (value === null || value === undefined || value === '') {
            return 0;
        }

        if (typeof value === 'number') {
            return isFinite(value) ? value : 0;
        }

        if (typeof value === 'string') {
            let cleaned = value.toString();

            // Erkenne deutsches Format (1.234,56) vs englisches Format (1,234.56)
            const hasCommaDecimal = cleaned.indexOf(',') > cleaned.lastIndexOf('.');
            const hasDotThousand = cleaned.match(/\d{1,3}(\.\d{3})+,\d{2}$/);

            if (hasDotThousand || hasCommaDecimal) {
                // Deutsches Format: Entferne Tausenderpunkte, wandle Komma zu Punkt
                cleaned = cleaned.replace(/\./g, '').replace(',', '.');
            } else {
                // Fallback: Entferne alle nicht-numerischen Zeichen außer letztem Dezimaltrennzeichen
                cleaned = cleaned.replace(/[^\d.,-]/g, '');
                if (cleaned.includes(',')) {
                    cleaned = cleaned.replace(',', '.');
                }
            }

            const parsed = parseFloat(cleaned);
            return isNaN(parsed) ? 0 : parsed;
        }

        return 0;
    }

    // Formatiere Betrag im deutschen Format (1.234,56)
    function formatAmount(value: number): string {
        if (!isFinite(value)) {
            return '0,00';
        }

        // Deutsche Zahlenformatierung: Punkt als Tausendertrennzeichen, Komma als Dezimaltrennzeichen
        const formatted = value.toFixed(2);
        const parts = formatted.split('.');
        const integerPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
        const decimalPart = parts[1];

        return integerPart + ',' + decimalPart;
    }

    // Runde auf 2 Dezimalstellen
    function roundToTwo(value: number): number {
        return Math.round((value + Number.EPSILON) * 100) / 100;
    }

    // Konfiguriere deutsche Zahlenformatierung für Kendo Controls
    function configureGermanFormatting(): void {
        debugLog('Konfiguriere deutsche Zahlenformatierung');

        const eigenSuffixes = getExistingSuffixes('eigenleistung_menge');
        const fremdSuffixes = getExistingSuffixes('fremdleistung_summe');

        eigenSuffixes.forEach((suffix) => {
            const mengeCtrl = getControl('eigenleistung_menge' + suffix);
            const epCtrl = getControl('eigenleistung_ep' + suffix);
            const summeCtrl = getControl('eigenleistung_summe' + suffix);

            if (mengeCtrl && typeof mengeCtrl.setKendoOptions === 'function') {
                mengeCtrl.setKendoOptions({
                    culture: 'de-DE',
                    decimals: 2,
                    format: 'n2'
                });
            }
            if (epCtrl && typeof epCtrl.setKendoOptions === 'function') {
                epCtrl.setKendoOptions({
                    culture: 'de-DE',
                    decimals: 2,
                    format: 'n2'
                });
            }
            if (summeCtrl && typeof summeCtrl.setKendoOptions === 'function') {
                summeCtrl.setKendoOptions({
                    culture: 'de-DE',
                    decimals: 2,
                    format: 'n2'
                });
            }
        });

        const summaryControls = ['summe_eigenleistungen', 'summe_fremdleistungen_netto', 'mwst_fremdleistungen', 'summe_fremdleistungen_brutto', 'summary_eigenleistung', 'summary_fremdleistung', 'summary_gesamt'];
        summaryControls.forEach((id) => {
            const ctrl = getControl(id);
            if (ctrl && typeof ctrl.setKendoOptions === 'function') {
                ctrl.setKendoOptions({
                    culture: 'de-DE',
                    decimals: 2,
                    format: 'n2'
                });
            }
        });
    }

    // Prüfe ob alle Controls verfügbar sind
    function areControlsReady(): boolean {
        const count = getRepeatingCount(EIGENLEISTUNG_REPEATING_ID);
        let readyCount = 0;
        
        for (let i = 1; i <= count; i++) {
            const suffix = `_hfrepeating_${i}`;
            const mengeElement = document.getElementById(`eigenleistung_menge${suffix}`);
            const epElement = document.getElementById(`eigenleistung_ep${suffix}`);
            
            if (mengeElement && epElement) {
                readyCount++;
            }
        }
        
        debugLog(`Controls bereit: ${readyCount}/${count}`);
        return readyCount === count && count > 0;
    }

    // Hole die tatsächlich vorhandenen Suffixe anhand der DOM-IDs
    function getExistingSuffixes(baseIdPrefix: string): string[] {
        const suffixes: string[] = [];
        const selector = `[id^="${baseIdPrefix}_hfrepeating_"]`;
        const nodes = document.querySelectorAll(selector);
        nodes.forEach(node => {
            if (!(node instanceof HTMLElement) || !node.id) {
                return;
            }
            const id = node.id;
            // Ignoriere Kendo UI Inputs
            if (id.endsWith('-kendoInput')) {
                return;
            }
            const suffix = id.substring(baseIdPrefix.length); // includes leading _hfrepeating_...
            if (suffix && !suffixes.includes(suffix)) {
                suffixes.push(suffix);
            }
        });
        // Stabil: nach natürlicher Reihenfolge sortieren (nach der letzten Nummer)
        suffixes.sort((a, b) => {
            const numA = parseInt(a.replace(/[^0-9]/g, ''), 10) || 0;
            const numB = parseInt(b.replace(/[^0-9]/g, ''), 10) || 0;
            return numA - numB;
        });
        debugLog(`Gefundene Suffixe für ${baseIdPrefix}: ${JSON.stringify(suffixes)}`);
        return suffixes;
    }

    // Berechne Eigenleistungen
    function calculateEigenleistungen(): void {
        debugLog('=== Berechne Eigenleistungen ===');
        try {
            const suffixes = getExistingSuffixes('eigenleistung_menge');
            debugLog(`Anzahl Eigenleistungen: ${suffixes.length}`);

            let total = 0;
            suffixes.forEach((suffix, idx) => {
                const mengeId = `eigenleistung_menge${suffix}`;
                const epId = `eigenleistung_ep${suffix}`;
                const summeId = `eigenleistung_summe${suffix}`;
                const indexId = `eigenleistung_index${suffix}`;

                const menge = parseNumber(getControlValue(mengeId));
                const ep = parseNumber(getControlValue(epId));
                const summe = roundToTwo(menge * ep);
                debugLog(`Zeile ${idx + 1} (${suffix}): Menge=${menge}, EP=${ep}, Summe=${summe}`);

                setControlValue(summeId, formatAmount(summe));
                setControlValue(indexId, String(idx + 1));
                total += summe;
            });

            const totalFormatted = formatAmount(total);
            debugLog(`Eigenleistungen Total: ${totalFormatted}`);
            setControlValue('summe_eigenleistungen', totalFormatted);
            setControlValue('summary_eigenleistung', totalFormatted);
            calculateGrandTotal();
        } catch (error) {
            debugLog('Fehler bei Eigenleistungsberechnung:', error);
        }
    }

    // Berechne Fremdleistungen
    function calculateFremdleistungen(): void {
        debugLog('=== Berechne Fremdleistungen ===');
        try {
            const suffixes = getExistingSuffixes('fremdleistung_summe');
            debugLog(`Anzahl Fremdleistungen: ${suffixes.length}`);

            let netto = 0;
            suffixes.forEach((suffix, idx) => {
                const summeId = `fremdleistung_summe${suffix}`;
                const indexId = `fremdleistung_index${suffix}`;
                const summe = parseNumber(getControlValue(summeId));
                debugLog(`Zeile ${idx + 1} (${suffix}): Summe=${summe}`);
                setControlValue(indexId, String(idx + 1));
                netto += summe;
            });

            const nettoRounded = roundToTwo(netto);
            const mwst = roundToTwo(nettoRounded * MWST_RATE);
            const brutto = roundToTwo(nettoRounded + mwst);
            debugLog(`Fremdleistungen: Netto=${nettoRounded}, MwSt=${mwst}, Brutto=${brutto}`);
            setControlValue('summe_fremdleistungen_netto', formatAmount(nettoRounded));
            setControlValue('mwst_fremdleistungen', formatAmount(mwst));
            setControlValue('summe_fremdleistungen_brutto', formatAmount(brutto));
            setControlValue('summary_fremdleistung', formatAmount(brutto));
            calculateGrandTotal();
        } catch (error) {
            debugLog('Fehler bei Fremdleistungsberechnung:', error);
        }
    }

    // Berechne Gesamtsumme
    function calculateGrandTotal(): void {
        debugLog('=== Berechne Gesamtsumme ===');
        
        try {
            const eigenTotal = parseNumber(getControlValue('summary_eigenleistung'));
            const fremdTotal = parseNumber(getControlValue('summary_fremdleistung'));
            const grandTotal = roundToTwo(eigenTotal + fremdTotal);
            
            debugLog(`Gesamtsumme: Eigen=${eigenTotal} + Fremd=${fremdTotal} = ${grandTotal}`);
            
            setControlValue('summary_gesamt', formatAmount(grandTotal));
            
            // Automatisch Fotos-Checkbox aktivieren bei >= 1500€
            if (grandTotal >= 1500) {
                setControlValue('beilage_fotos', true);
                debugLog('Fotos-Checkbox aktiviert (>= 1500€)');
            }
            
        } catch (error) {
            debugLog('Fehler bei Gesamtsummenberechnung:', error);
        }
    }

    // Exportierte Funktionen für onChanged Callbacks
    export function calculateEigenleistungRowRepeatable(this: any, value?: unknown, ctrl?: any): void {
        debugLog('calculateEigenleistungRowRepeatable aufgerufen', { value, ctrl });
        calculateEigenleistungen();
    }

    export function calculateFremdleistungTotalRepeatable(this: any, value?: unknown, ctrl?: any): void {
        debugLog('calculateFremdleistungTotalRepeatable aufgerufen', { value, ctrl });
        calculateFremdleistungen();
    }

    // Test-Funktion für Debugging
    export function testCallback(): void {
        debugLog('TEST CALLBACK FUNKTIONIERT!');
        alert('Test Callback funktioniert!');
    }

    // Event Handler für Repeating Units
    function onEigenleistungAdded(): void {
        debugLog('Eigenleistung hinzugefügt');
        // Binde DOM Events für neue Zeile
        setTimeout(() => {
            const suffixes = getExistingSuffixes('eigenleistung_menge');
            const latestSuffix = suffixes[suffixes.length - 1];
            if (latestSuffix && !latestSuffix.includes('-kendoInput')) {
                bindDOMEventsForSuffix(latestSuffix);
            }
            configureGermanFormatting();
            calculateEigenleistungen();
        }, 100);
    }

    function onEigenleistungRemoved(): void {
        debugLog('Eigenleistung entfernt');
        setTimeout(calculateEigenleistungen, 100);
    }

    function onFremdleistungAdded(): void {
        debugLog('Fremdleistung hinzugefügt');
        // Binde DOM Events für neue Zeile
        setTimeout(() => {
            const suffixes = getExistingSuffixes('fremdleistung_summe');
            const latestSuffix = suffixes[suffixes.length - 1];
            if (latestSuffix && !latestSuffix.includes('-kendoInput')) {
                bindDOMEventsForSuffix(latestSuffix);
            }
            configureGermanFormatting();
            calculateFremdleistungen();
        }, 100);
    }

    function onFremdleistungRemoved(): void {
        debugLog('Fremdleistung entfernt');
        setTimeout(calculateFremdleistungen, 100);
    }

    // Hilfsfunktion für DOM Event Binding
    function bindDOMEventsForSuffix(suffix: string): void {
        ['eigenleistung_menge', 'eigenleistung_ep'].forEach(baseId => {
            const id = `${baseId}${suffix}`;
            const element = document.getElementById(id);
            if (element) {
                debugLog(`Registriere DOM Event Listener für neue Zeile ${id}`);
                element.removeEventListener('input', calculateEigenleistungRowRepeatable);
                element.removeEventListener('change', calculateEigenleistungRowRepeatable);
                element.addEventListener('input', calculateEigenleistungRowRepeatable);
                element.addEventListener('change', calculateEigenleistungRowRepeatable);
            }
        });

        const fremdId = `fremdleistung_summe${suffix}`;
        const fremdElement = document.getElementById(fremdId);
        if (fremdElement) {
            debugLog(`Registriere DOM Event Listener für neue Zeile ${fremdId}`);
            fremdElement.removeEventListener('input', calculateFremdleistungTotalRepeatable);
            fremdElement.removeEventListener('change', calculateFremdleistungTotalRepeatable);
            fremdElement.addEventListener('input', calculateFremdleistungTotalRepeatable);
            fremdElement.addEventListener('change', calculateFremdleistungTotalRepeatable);
        }
    }

    // Hinweis: Direkte DOM Event Listener entfernt, wir nutzen wieder onChanged Callbacks

    // Initialisierung
    function initialize(): void {
        debugLog('=== Initialisierung BehebungsprotokollHelper ===');
        
        // Warte auf HybridForms API
        const checkAPI = () => {
            if (isHybridFormsAvailable()) {
                debugLog('HybridForms API verfügbar, registriere Event Handler');
                
                try {
                    const api = getAPI();
                    
                    // Registriere Event Handler für Repeating Units
                    if (api.RepeatingUnits?.addEventListener) {
                        api.RepeatingUnits.addEventListener(EIGENLEISTUNG_REPEATING_ID, 'added', onEigenleistungAdded);
                        api.RepeatingUnits.addEventListener(EIGENLEISTUNG_REPEATING_ID, 'removed', onEigenleistungRemoved);
                        api.RepeatingUnits.addEventListener(FREMDLEISTUNG_REPEATING_ID, 'added', onFremdleistungAdded);
                        api.RepeatingUnits.addEventListener(FREMDLEISTUNG_REPEATING_ID, 'removed', onFremdleistungRemoved);
                        debugLog('Event Handler registriert');
                    }

                    // Registriere direkte DOM Event Listener als Fallback
                    function bindDOMEvents(suffix: string) {
                        ['eigenleistung_menge', 'eigenleistung_ep'].forEach(baseId => {
                            const id = `${baseId}${suffix}`;
                            const element = document.getElementById(id);
                            if (element) {
                                debugLog(`Registriere DOM Event Listener für ${id}`);
                                // Entferne alte Listener
                                element.removeEventListener('input', calculateEigenleistungRowRepeatable);
                                element.removeEventListener('change', calculateEigenleistungRowRepeatable);
                                // Füge neue Listener hinzu
                                element.addEventListener('input', calculateEigenleistungRowRepeatable);
                                element.addEventListener('change', calculateEigenleistungRowRepeatable);
                                debugLog(`DOM Event Listener für ${id} registriert`);
                            }
                        });

                        const fremdId = `fremdleistung_summe${suffix}`;
                        const fremdElement = document.getElementById(fremdId);
                        if (fremdElement) {
                            debugLog(`Registriere DOM Event Listener für ${fremdId}`);
                            // Entferne alte Listener
                            fremdElement.removeEventListener('input', calculateFremdleistungTotalRepeatable);
                            fremdElement.removeEventListener('change', calculateFremdleistungTotalRepeatable);
                            // Füge neue Listener hinzu
                            fremdElement.addEventListener('input', calculateFremdleistungTotalRepeatable);
                            fremdElement.addEventListener('change', calculateFremdleistungTotalRepeatable);
                            debugLog(`DOM Event Listener für ${fremdId} registriert`);
                        }
                    }

                    // Binde DOM Events für existierende Controls
                    getExistingSuffixes('eigenleistung_menge')
                        .filter(suffix => !suffix.includes('-kendoInput'))
                        .forEach(bindDOMEvents);
                    
                    // Registriere Page Refresh Handler
                    if (api.Page?.addEventListener) {
                        const refreshAll = () => {
                            debugLog('Page refresh - berechne alle Werte');
                            calculateEigenleistungen();
                            calculateFremdleistungen();
                        };
                        
                        api.Page.addEventListener('rendered', refreshAll);
                        api.Page.addEventListener('viewrendered', refreshAll);
                        debugLog('Page refresh Handler registriert');
                    }
                    
        // Direkte DOM Event Listener werden nicht mehr verwendet; wir verlassen uns auf onChanged und RU-Events
                    
                    // Initiale Berechnung mit mehreren Versuchen
                    setTimeout(() => {
                        debugLog('Erste Berechnung nach 500ms');
                        configureGermanFormatting();
                        calculateEigenleistungen();
                        calculateFremdleistungen();
                    }, 500);
                    
                    setTimeout(() => {
                        debugLog('Zweite Berechnung nach 2000ms');
                        configureGermanFormatting();
                        calculateEigenleistungen();
                        calculateFremdleistungen();
                    }, 2000);
                    
                    setTimeout(() => {
                        debugLog('Dritte Berechnung nach 5000ms');
                        configureGermanFormatting();
                        calculateEigenleistungen();
                        calculateFremdleistungen();
                    }, 5000);
                    
                } catch (error) {
                    debugLog('Fehler bei der Initialisierung:', error);
                }
            } else {
                debugLog('HybridForms API noch nicht verfügbar, versuche erneut in 100ms');
                setTimeout(checkAPI, 100);
            }
        };
        
        checkAPI();
    }

    // Expose Funktionen global
    function exposeToGlobal(): void {
        debugLog('Expose Funktionen zu globalem Namespace');
        
        const globalObj = window as any;
        
        // Stelle sicher dass Namespace existiert
        if (!globalObj.HFFormdefinition) {
            globalObj.HFFormdefinition = {};
        }
        if (!globalObj.HFFormdefinition.BehebungsprotokollHelper) {
            globalObj.HFFormdefinition.BehebungsprotokollHelper = {};
        }
        
        // Expose Funktionen
        globalObj.HFFormdefinition.BehebungsprotokollHelper.calculateEigenleistungRowRepeatable = calculateEigenleistungRowRepeatable;
        globalObj.HFFormdefinition.BehebungsprotokollHelper.calculateFremdleistungTotalRepeatable = calculateFremdleistungTotalRepeatable;
        globalObj.HFFormdefinition.BehebungsprotokollHelper.testCallback = testCallback;
        
        // Test-Funktionen
        globalObj.HFFormdefinition.BehebungsprotokollHelper.testCalculation = () => {
            debugLog('=== MANUELLER TEST ===');
            calculateEigenleistungen();
            calculateFremdleistungen();
        };
        
        globalObj.HFFormdefinition.BehebungsprotokollHelper.testControls = () => {
            debugLog('=== CONTROL TEST ===');
            debugLog('Controls bereit:', areControlsReady());
            debugLog('Eigenleistungen Count:', getRepeatingCount(EIGENLEISTUNG_REPEATING_ID));
            debugLog('Fremdleistungen Count:', getRepeatingCount(FREMDLEISTUNG_REPEATING_ID));
        };
        
        debugLog('Funktionen erfolgreich exponiert');
    }

    // Starte Initialisierung
    exposeToGlobal();
    
    // Warte bis DOM geladen ist
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize);
    } else {
        initialize();
    }
    
    // Zusätzlich nach kurzer Verzögerung
    setTimeout(initialize, 1000);
}


