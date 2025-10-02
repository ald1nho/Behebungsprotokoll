var HFFormdefinition;
(function (HFFormdefinition) {
    var BehebungsprotokollHelper;
    (function (BehebungsprotokollHelper) {
        var EIGENLEISTUNG_REPEATING_ID = 'tab_eigenleistungen';
        var FREMDLEISTUNG_REPEATING_ID = 'tab_fremdleistungen';
        var MWST_RATE = 0.2;
        function debugLog(message, data) {
            console.log("[BehebungsprotokollHelper] ".concat(message), data || '');
        }
        function isHybridFormsAvailable() {
            var _a;
            return !!((_a = window.HybridForms) === null || _a === void 0 ? void 0 : _a.API);
        }
        function getAPI() {
            var _a;
            return (_a = window.HybridForms) === null || _a === void 0 ? void 0 : _a.API;
        }
        function getControl(id) {
            var _a, _b;
            if (!isHybridFormsAvailable()) {
                debugLog("HybridForms API nicht verf\u00FCgbar f\u00FCr Control: ".concat(id));
                return null;
            }
            try {
                var api = getAPI();
                var ctrl = (_b = (_a = api.FormControls) === null || _a === void 0 ? void 0 : _a.getCtrl) === null || _b === void 0 ? void 0 : _b.call(_a, id);
                if (!ctrl) {
                    debugLog("Control nicht gefunden: ".concat(id));
                }
                return ctrl;
            }
            catch (error) {
                debugLog("Fehler beim Holen des Controls ".concat(id, ":"), error);
                return null;
            }
        }
        function setControlValue(id, value) {
            var element = document.getElementById(id);
            if (element) {
                if (element instanceof HTMLInputElement && element.type === 'checkbox') {
                    element.checked = Boolean(value);
                }
                else {
                    element.value = String(value);
                }
                debugLog("DOM-Wert gesetzt f\u00FCr ".concat(id, ": ").concat(value));
            }
            var ctrl = getControl(id);
            if (ctrl && typeof ctrl.val === 'function') {
                try {
                    ctrl.val(value, true);
                    debugLog("API-Wert gesetzt f\u00FCr ".concat(id, ": ").concat(value));
                }
                catch (error) {
                    debugLog("Fehler beim Setzen des API-Werts f\u00FCr ".concat(id, ":"), error);
                }
            }
        }
        function getControlValue(id) {
            var element = document.getElementById(id);
            if (element) {
                var value = element instanceof HTMLInputElement && element.type === 'checkbox' ? element.checked : element.value;
                if (value !== null && value !== undefined && value !== '') {
                    debugLog("DOM-Wert f\u00FCr ".concat(id, ": ").concat(value));
                    return value;
                }
            }
            var ctrl = getControl(id);
            if (ctrl && typeof ctrl.val === 'function') {
                try {
                    var value = ctrl.val();
                    debugLog("API-Wert f\u00FCr ".concat(id, ": ").concat(value));
                    return value;
                }
                catch (error) {
                    debugLog("Fehler beim Holen des API-Werts f\u00FCr ".concat(id, ":"), error);
                }
            }
            debugLog("Kein Wert gefunden f\u00FCr ".concat(id));
            return '';
        }
        function getRepeatingCount(repeatingId) {
            var _a, _b;
            if (!isHybridFormsAvailable()) {
                debugLog("HybridForms API nicht verf\u00FCgbar f\u00FCr Repeating Count: ".concat(repeatingId));
                return 0;
            }
            try {
                var api = getAPI();
                var count = ((_b = (_a = api.RepeatingUnits) === null || _a === void 0 ? void 0 : _a.count) === null || _b === void 0 ? void 0 : _b.call(_a, repeatingId)) || 0;
                debugLog("Repeating Count f\u00FCr ".concat(repeatingId, ": ").concat(count));
                return count;
            }
            catch (error) {
                debugLog("Fehler beim Holen der Repeating Count f\u00FCr ".concat(repeatingId, ":"), error);
                return 0;
            }
        }
        function parseNumber(value) {
            if (value === null || value === undefined || value === '') {
                return 0;
            }
            if (typeof value === 'number') {
                return isFinite(value) ? value : 0;
            }
            if (typeof value === 'string') {
                // Deutsche Formatierung: Tausenderpunkt entfernen, Dezimalkomma zu Punkt
                var cleaned = value.replace(/[^\d.,-]/g, '');

                // Unterscheide deutsche und englische Formatierung
                if (cleaned.includes(',')) {
                    // Deutsche Formatierung: 1.234,56 -> 1234.56
                    var lastComma = cleaned.lastIndexOf(',');
                    var lastDot = cleaned.lastIndexOf('.');

                    if (lastComma > lastDot) {
                        // Komma ist Dezimaltrennzeichen, Punkte sind Tausendertrennzeichen
                        cleaned = cleaned.substring(0, lastComma).replace(/\./g, '') + '.' + cleaned.substring(lastComma + 1);
                    } else {
                        // Punkt ist Dezimaltrennzeichen, Kommas ersetzen
                        cleaned = cleaned.replace(/,/g, '');
                    }
                }

                var parsed = parseFloat(cleaned);
                return isNaN(parsed) ? 0 : parsed;
            }
            return 0;
        }
        function formatAmount(value) {
            if (!isFinite(value)) {
                return '0,00';
            }
            // Deutsche Formatierung: Tausenderpunkt, Dezimalkomma
            var formatted = value.toFixed(2);
            var parts = formatted.split('.');
            var integerPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
            var decimalPart = parts[1];
            return integerPart + ',' + decimalPart;
        }
        function roundToTwo(value) {
            return Math.round((value + Number.EPSILON) * 100) / 100;
        }
        function configureGermanFormatting() {
            debugLog('=== Konfiguriere deutsche Zahlenformatierung ===');
            try {
                // Finde alle NumericField Controls und konfiguriere sie (nur Eigenleistungen)
                var numericFields = [
                    'eigenleistung_menge', 'eigenleistung_ep'
                ];

                // Konfiguriere vorhandene Felder
                numericFields.forEach(function(baseId) {
                    var suffixes = getExistingSuffixes(baseId);
                    suffixes.forEach(function(suffix) {
                        var fieldId = baseId + suffix;
                        var ctrl = getControl(fieldId);
                        if (ctrl && typeof ctrl.setKendoOptions === 'function') {
                            ctrl.setKendoOptions({
                                culture: 'de-DE',
                                decimals: 2,
                                format: 'n2'
                            });
                            debugLog("Deutsche Formatierung gesetzt für: " + fieldId);
                        }
                    });
                });

                // Konfiguriere auch die ersten Felder (ohne Suffix)
                numericFields.forEach(function(baseId) {
                    var ctrl = getControl(baseId);
                    if (ctrl && typeof ctrl.setKendoOptions === 'function') {
                        ctrl.setKendoOptions({
                            culture: 'de-DE',
                            decimals: 2,
                            format: 'n2'
                        });
                        debugLog("Deutsche Formatierung gesetzt für: " + baseId);
                    }
                });
            }
            catch (error) {
                debugLog('Fehler bei der Formatierungskonfiguration:', error);
            }
        }
        function getExistingSuffixes(baseIdPrefix) {
            var suffixes = [];
            var selector = "[id^=\"".concat(baseIdPrefix, "_hfrepeating_\"]");
            var nodes = document.querySelectorAll(selector);
            nodes.forEach(function (node) {
                if (!(node instanceof HTMLElement) || !node.id) {
                    return;
                }
                var id = node.id;
                if (id.endsWith('-kendoInput')) {
                    return;
                }
                var suffix = id.substring(baseIdPrefix.length);
                if (suffix && !suffixes.includes(suffix)) {
                    suffixes.push(suffix);
                }
            });
            suffixes.sort(function (a, b) {
                var numA = parseInt(a.replace(/[^0-9]/g, ''), 10) || 0;
                var numB = parseInt(b.replace(/[^0-9]/g, ''), 10) || 0;
                return numA - numB;
            });
            debugLog("Gefundene Suffixe f\u00FCr ".concat(baseIdPrefix, ": ").concat(JSON.stringify(suffixes)));
            return suffixes;
        }
        function calculateEigenleistungen() {
            debugLog('=== Berechne Eigenleistungen ===');
            try {
                var suffixes = getExistingSuffixes('eigenleistung_menge');
                debugLog("Anzahl Eigenleistungen: ".concat(suffixes.length));
                var total_1 = 0;
                suffixes.forEach(function (suffix, idx) {
                    var mengeId = "eigenleistung_menge".concat(suffix);
                    var epId = "eigenleistung_ep".concat(suffix);
                    var summeId = "eigenleistung_summe".concat(suffix);
                    var indexId = "eigenleistung_index".concat(suffix);
                    var menge = parseNumber(getControlValue(mengeId));
                    var ep = parseNumber(getControlValue(epId));
                    var summe = roundToTwo(menge * ep);
                    debugLog("Zeile ".concat(idx + 1, " (").concat(suffix, "): Menge=").concat(menge, ", EP=").concat(ep, ", Summe=").concat(summe));
                    setControlValue(summeId, formatAmount(summe));
                    setControlValue(indexId, String(idx + 1));
                    total_1 += summe;
                });
                var totalFormatted = formatAmount(total_1);
                debugLog("Eigenleistungen Total: ".concat(totalFormatted));
                setControlValue('summe_eigenleistungen', totalFormatted);
                setControlValue('summary_eigenleistung', totalFormatted);
                calculateGrandTotal();
            }
            catch (error) {
                debugLog('Fehler bei Eigenleistungsberechnung:', error);
            }
        }
        function calculateFremdleistungen() {
            debugLog('=== Berechne Fremdleistungen ===');
            try {
                var suffixes = getExistingSuffixes('fremdleistung_summe');
                debugLog("Anzahl Fremdleistungen: ".concat(suffixes.length));
                var netto_1 = 0;
                suffixes.forEach(function (suffix, idx) {
                    var summeId = "fremdleistung_summe".concat(suffix);
                    var indexId = "fremdleistung_index".concat(suffix);
                    var summe = parseNumber(getControlValue(summeId));
                    debugLog("Zeile ".concat(idx + 1, " (").concat(suffix, "): Summe=").concat(summe));
                    setControlValue(indexId, String(idx + 1));
                    netto_1 += summe;
                });
                var nettoRounded = roundToTwo(netto_1);
                var mwst = roundToTwo(nettoRounded * MWST_RATE);
                var brutto = roundToTwo(nettoRounded + mwst);
                debugLog("Fremdleistungen: Netto=".concat(nettoRounded, ", MwSt=").concat(mwst, ", Brutto=").concat(brutto));
                setControlValue('summe_fremdleistungen_netto', formatAmount(nettoRounded));
                setControlValue('mwst_fremdleistungen', formatAmount(mwst));
                setControlValue('summe_fremdleistungen_brutto', formatAmount(brutto));
                setControlValue('summary_fremdleistung', formatAmount(brutto));
                calculateGrandTotal();
            }
            catch (error) {
                debugLog('Fehler bei Fremdleistungsberechnung:', error);
            }
        }
        function calculateGrandTotal() {
            debugLog('=== Berechne Gesamtsumme ===');
            try {
                var eigenTotal = parseNumber(getControlValue('summary_eigenleistung'));
                var fremdTotal = parseNumber(getControlValue('summary_fremdleistung'));
                var grandTotal = roundToTwo(eigenTotal + fremdTotal);
                debugLog("Gesamtsumme: Eigen=".concat(eigenTotal, " + Fremd=").concat(fremdTotal, " = ").concat(grandTotal));
                setControlValue('summary_gesamt', formatAmount(grandTotal));
                if (grandTotal >= 1500) {
                    setControlValue('beilage_fotos', true);
                    debugLog('Fotos-Checkbox aktiviert (>= 1500€)');
                }
            }
            catch (error) {
                debugLog('Fehler bei Gesamtsummenberechnung:', error);
            }
        }
        function calculateEigenleistungRowRepeatable(value, ctrl) {
            debugLog('calculateEigenleistungRowRepeatable aufgerufen', { value: value, ctrl: ctrl });

            // Formatiere den eingegebenen Wert sofort mit deutscher Formatierung
            if (ctrl && typeof ctrl.val === 'function' && value !== null && value !== undefined && value !== '') {
                var numericValue = parseNumber(value);
                if (numericValue !== 0 || value === 0 || value === '0') {
                    setTimeout(function() {
                        var formattedValue = formatAmount(numericValue);
                        debugLog('Formatiere Eigenleistung von ' + value + ' zu ' + formattedValue);
                        ctrl.val(formattedValue, true); // true = disable onChanged to prevent loop

                        // Zusätzlich: DOM Element direkt setzen als Backup
                        var element = ctrl.element;
                        if (element && element.length > 0) {
                            element.val(formattedValue);
                            debugLog('DOM Backup gesetzt für Eigenleistung: ' + formattedValue);
                        }
                    }, 50);
                }
            }

            calculateEigenleistungen();
        }
        BehebungsprotokollHelper.calculateEigenleistungRowRepeatable = calculateEigenleistungRowRepeatable;
        function calculateFremdleistungTotalRepeatable(value, ctrl) {
            debugLog('calculateFremdleistungTotalRepeatable aufgerufen', { value: value, ctrl: ctrl });
            calculateFremdleistungen();
        }
        BehebungsprotokollHelper.calculateFremdleistungTotalRepeatable = calculateFremdleistungTotalRepeatable;
        function onEigenleistungAdded() {
            debugLog('Eigenleistung hinzugefügt');
            setTimeout(function () {
                var suffixes = getExistingSuffixes('eigenleistung_menge');
                var latestSuffix = suffixes[suffixes.length - 1];
                if (latestSuffix && !latestSuffix.includes('-kendoInput')) {
                    bindDOMEventsForSuffix(latestSuffix);
                }
                configureGermanFormatting();
                calculateEigenleistungen();
            }, 100);
        }
        function onEigenleistungRemoved() {
            debugLog('Eigenleistung entfernt');
            setTimeout(calculateEigenleistungen, 100);
        }
        function onFremdleistungAdded() {
            debugLog('Fremdleistung hinzugefügt');
            setTimeout(function () {
                var suffixes = getExistingSuffixes('fremdleistung_summe');
                var latestSuffix = suffixes[suffixes.length - 1];
                if (latestSuffix && !latestSuffix.includes('-kendoInput')) {
                    bindDOMEventsForSuffix(latestSuffix);
                }
                calculateFremdleistungen();
            }, 100);
        }
        function onFremdleistungRemoved() {
            debugLog('Fremdleistung entfernt');
            setTimeout(calculateFremdleistungen, 100);
        }
        function bindDOMEventsForSuffix(suffix) {
            ['eigenleistung_menge', 'eigenleistung_ep'].forEach(function (baseId) {
                var id = "".concat(baseId).concat(suffix);
                var element = document.getElementById(id);
                if (element) {
                    debugLog("Registriere DOM Event Listener f\u00FCr neue Zeile ".concat(id));
                    element.removeEventListener('input', calculateEigenleistungRowRepeatable);
                    element.removeEventListener('change', calculateEigenleistungRowRepeatable);
                    element.addEventListener('input', calculateEigenleistungRowRepeatable);
                    element.addEventListener('change', calculateEigenleistungRowRepeatable);
                }
            });
            var fremdId = "fremdleistung_summe".concat(suffix);
            var fremdElement = document.getElementById(fremdId);
            if (fremdElement) {
                debugLog("Registriere DOM Event Listener f\u00FCr neue Zeile ".concat(fremdId));
                fremdElement.removeEventListener('input', calculateFremdleistungTotalRepeatable);
                fremdElement.removeEventListener('change', calculateFremdleistungTotalRepeatable);
                fremdElement.addEventListener('input', calculateFremdleistungTotalRepeatable);
                fremdElement.addEventListener('change', calculateFremdleistungTotalRepeatable);
            }
        }
        function initialize() {
            debugLog('=== Initialisierung BehebungsprotokollHelper ===');
            var checkAPI = function () {
                var _a, _b;
                if (isHybridFormsAvailable()) {
                    debugLog('HybridForms API verfügbar, registriere Event Handler');
                    try {
                        var api = getAPI();
                        if ((_a = api.RepeatingUnits) === null || _a === void 0 ? void 0 : _a.addEventListener) {
                            api.RepeatingUnits.addEventListener(EIGENLEISTUNG_REPEATING_ID, 'added', onEigenleistungAdded);
                            api.RepeatingUnits.addEventListener(EIGENLEISTUNG_REPEATING_ID, 'removed', onEigenleistungRemoved);
                            api.RepeatingUnits.addEventListener(FREMDLEISTUNG_REPEATING_ID, 'added', onFremdleistungAdded);
                            api.RepeatingUnits.addEventListener(FREMDLEISTUNG_REPEATING_ID, 'removed', onFremdleistungRemoved);
                            debugLog('Event Handler registriert');
                        }
                        getExistingSuffixes('eigenleistung_menge')
                            .filter(function (suffix) { return !suffix.includes('-kendoInput'); })
                            .forEach(bindDOMEventsForSuffix);
                        if ((_b = api.Page) === null || _b === void 0 ? void 0 : _b.addEventListener) {
                            var refreshAll = function () {
                                debugLog('Page refresh - berechne alle Werte');
                                calculateEigenleistungen();
                                calculateFremdleistungen();
                            };
                            api.Page.addEventListener('rendered', refreshAll);
                            api.Page.addEventListener('viewrendered', refreshAll);
                            debugLog('Page refresh Handler registriert');
                        }
                        setTimeout(function () {
                            debugLog('Erste Berechnung nach 500ms');
                            configureGermanFormatting();
                            calculateEigenleistungen();
                            calculateFremdleistungen();
                        }, 500);
                        setTimeout(function () {
                            debugLog('Zweite Berechnung nach 2000ms');
                            configureGermanFormatting();
                            calculateEigenleistungen();
                            calculateFremdleistungen();
                        }, 2000);
                        setTimeout(function () {
                            debugLog('Dritte Berechnung nach 5000ms');
                            configureGermanFormatting();
                            calculateEigenleistungen();
                            calculateFremdleistungen();
                        }, 5000);
                    }
                    catch (error) {
                        debugLog('Fehler bei der Initialisierung:', error);
                    }
                }
                else {
                    debugLog('HybridForms API noch nicht verfügbar, versuche erneut in 100ms');
                    setTimeout(checkAPI, 100);
                }
            };
            checkAPI();
        }
        function exposeToGlobal() {
            debugLog('Expose Funktionen zu globalem Namespace');
            var globalObj = window;
            if (!globalObj.HFFormdefinition) {
                globalObj.HFFormdefinition = {};
            }
            if (!globalObj.HFFormdefinition.BehebungsprotokollHelper) {
                globalObj.HFFormdefinition.BehebungsprotokollHelper = {};
            }
            globalObj.HFFormdefinition.BehebungsprotokollHelper.calculateEigenleistungRowRepeatable = calculateEigenleistungRowRepeatable;
            globalObj.HFFormdefinition.BehebungsprotokollHelper.calculateFremdleistungTotalRepeatable = calculateFremdleistungTotalRepeatable;
            globalObj.HFFormdefinition.BehebungsprotokollHelper.configureGermanFormatting = configureGermanFormatting;
            debugLog('Funktionen erfolgreich exponiert');
        }
        exposeToGlobal();
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', initialize);
        }
        else {
            initialize();
        }
        setTimeout(initialize, 1000);
    })(BehebungsprotokollHelper = HFFormdefinition.BehebungsprotokollHelper || (HFFormdefinition.BehebungsprotokollHelper = {}));
})(HFFormdefinition || (HFFormdefinition = {}));
