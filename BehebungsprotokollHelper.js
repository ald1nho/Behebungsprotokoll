var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
var HFFormdefinition;
(function (HFFormdefinition) {
    var BehebungsprotokollHelper;
    (function (BehebungsprotokollHelper) {
        var BerechnungsManager = (function () {
            function BerechnungsManager() {
            }
            BerechnungsManager.prototype.calculateGrandTotal = function () {
                var eigenleistungInput = document.getElementById('summe_eigenleistungen');
                var fremdleistungInput = document.getElementById('summe_fremdleistungen_brutto');
                var eigenleistung = eigenleistungInput
                    ? ((isFinite(eigenleistungInput.valueAsNumber) ? eigenleistungInput.valueAsNumber : parseFloat(eigenleistungInput.value.replace(',', '.'))) || 0)
                    : 0;
                var fremdleistung = fremdleistungInput
                    ? ((isFinite(fremdleistungInput.valueAsNumber) ? fremdleistungInput.valueAsNumber : parseFloat(fremdleistungInput.value.replace(',', '.'))) || 0)
                    : 0;
                var gesamt = eigenleistung + fremdleistung;
                var summaryEigenleistungInput = document.getElementById('summary_eigenleistung');
                var summaryFremdleistungInput = document.getElementById('summary_fremdleistung');
                var summaryGesamtInput = document.getElementById('summary_gesamt');
                if (summaryEigenleistungInput)
                    summaryEigenleistungInput.value = eigenleistung.toFixed(2);
                if (summaryFremdleistungInput)
                    summaryFremdleistungInput.value = fremdleistung.toFixed(2);
                if (summaryGesamtInput)
                    summaryGesamtInput.value = gesamt.toFixed(2);
                var fotosCheckbox = document.getElementById('beilage_fotos');
                if (fotosCheckbox && gesamt >= 1500) {
                    fotosCheckbox.checked = true;
                }
            };
            return BerechnungsManager;
        }());
        BehebungsprotokollHelper.BerechnungsManager = BerechnungsManager;
        var berechnungsManager = new BerechnungsManager();
        function getHybridForms() {
            var globalObj = window;
            return globalObj && globalObj.HybridForms ? globalObj.HybridForms : null;
        }
        function getHybridFormsAPI() {
            var hf = getHybridForms();
            return hf && hf.API ? hf.API : null;
        }
        function parseDecimal(value) {
            if (value === null || value === undefined) {
                return 0;
            }
            if (typeof value === 'number' && isFinite(value)) {
                return value;
            }
            var normalized = String(value).replace(/\s+/g, '').replace(/,/g, '.');
            var parsed = parseFloat(normalized);
            return isNaN(parsed) ? 0 : parsed;
        }
        function formatCurrency(value) {
            if (!isFinite(value)) {
                return '0.00';
            }
            return value.toFixed(2);
        }
        function normalizeFieldId(rawId) {
            if (!rawId) {
                return '';
            }
            return rawId.replace(/^hf-formcontrol-/i, '');
        }
        function getFieldElement(fieldId) {
            if (!fieldId) {
                return null;
            }
            var direct = document.getElementById(fieldId);
            if (direct) {
                return direct;
            }
            return document.querySelector("[data-hf-id=\"".concat(fieldId, "\"]"));
        }
        function extractFieldIdFromElement(element) {
            if (!element) {
                return '';
            }
            var candidates = [
                (element.dataset && element.dataset.hfId) || undefined,
                (element.dataset && element.dataset.hfFieldId) || undefined,
                element.getAttribute ? element.getAttribute('data-hf-id') || undefined : undefined,
                element.id || undefined,
            ];
            for (var _i = 0, candidates_1 = candidates; _i < candidates_1.length; _i++) {
                var candidate = candidates_1[_i];
                var normalized = normalizeFieldId(candidate);
                if (normalized) {
                    return normalized;
                }
            }
            var nested = element.querySelector('[data-hf-id], input[id]');
            if (nested) {
                return extractFieldIdFromElement(nested);
            }
            return '';
        }
        function extractSuffixFromFieldId(fieldId, baseId) {
            if (!fieldId) {
                return '';
            }
            var normalized = normalizeFieldId(fieldId);
            var regex = new RegExp("^".concat(baseId.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&'), "(.*)$"), 'i');
            var match = normalized.match(regex);
            return match ? match[1] : '';
        }
        function fieldExists(fieldId) {
            var _a;
            var api = getHybridFormsAPI();
            if ((_a = api === null || api === void 0 ? void 0 : api.Fields) === null || _a === void 0 ? void 0 : _a.getById) {
                var field = api.Fields.getById(fieldId);
                if (field) {
                    return true;
                }
            }
            if (document.getElementById(fieldId)) {
                return true;
            }
            return !!document.querySelector("[data-hf-id=\"".concat(fieldId, "\"]"));
        }
        function getFieldValue(fieldId) {
            var _a;
            var api = getHybridFormsAPI();
            if ((_a = api === null || api === void 0 ? void 0 : api.Fields) === null || _a === void 0 ? void 0 : _a.getById) {
                var field = api.Fields.getById(fieldId);
                if (field && field.value !== undefined && field.value !== null) {
                    return parseDecimal(field.value);
                }
            }
            var element = getFieldElement(fieldId);
            if (element) {
                return parseDecimal(element.value || element.getAttribute('value'));
            }
            return 0;
        }
        function setFieldValue(fieldId, value) {
            var _a;
            var api = getHybridFormsAPI();
            if ((_a = api === null || api === void 0 ? void 0 : api.Fields) === null || _a === void 0 ? void 0 : _a.setField) {
                try {
                    api.Fields.setField(fieldId, value);
                }
                catch (err) {
                }
            }
            var element = getFieldElement(fieldId);
            if (element) {
                element.value = value;
                element.setAttribute('value', value);
            }
        }
        function collectFieldElements(baseId) {
            var selectors = [
                "[data-hf-id^=\"".concat(baseId, "\" i]"),
                "input[id^=\"".concat(baseId, "\" i]")
            ];
            var elements = [];
            var seen = new Set();
            selectors.forEach(function (selector) {
                document.querySelectorAll(selector).forEach(function (element) {
                    var fieldId = extractFieldIdFromElement(element);
                    if (!fieldId || seen.has(fieldId)) {
                        return;
                    }
                    seen.add(fieldId);
                    elements.push(element);
                });
            });
            return elements;
        }
        var cachedEigenleistungRows = [];
        var pendingAddIndex = null;
        var pendingRemoveIndex = null;
        var cachedFremdleistungRows = [];
        var pendingFremdAddIndex = null;
        var pendingFremdRemoveIndex = null;
        function captureEigenleistungRows() {
            var mengeElements = collectFieldElements('eigenleistung_menge');
            var epElements = collectFieldElements('eigenleistung_ep');
            var sumElements = collectFieldElements('eigenleistung_summe');
            var rowCount = Math.max(mengeElements.length, epElements.length, sumElements.length);
            var rows = [];
            for (var i = 0; i < rowCount; i++) {
                var mengeEl = mengeElements[i];
                var epEl = epElements[i];
                var sumEl = sumElements[i];
                rows.push({
                    menge: mengeEl ? (mengeEl.value || mengeEl.getAttribute('value') || '') : '',
                    ep: epEl ? (epEl.value || epEl.getAttribute('value') || '') : '',
                    sum: sumEl ? (sumEl.value || sumEl.getAttribute('value') || '0.00') : '0.00'
                });
            }
            return rows;
        }
        function applyEigenleistungRows(rows) {
            var _a, _b, _c;
            var mengeElements = collectFieldElements('eigenleistung_menge');
            var epElements = collectFieldElements('eigenleistung_ep');
            var sumElements = collectFieldElements('eigenleistung_summe');
            var rowCount = Math.min(rows.length, mengeElements.length, epElements.length, sumElements.length);
            for (var i = 0; i < rowCount; i++) {
                var row = rows[i];
                var mengeId = extractFieldIdFromElement(mengeElements[i]);
                if (mengeId) {
                    setFieldValue(mengeId, (_a = row.menge) !== null && _a !== void 0 ? _a : '');
                }
                var epId = extractFieldIdFromElement(epElements[i]);
                if (epId) {
                    setFieldValue(epId, (_b = row.ep) !== null && _b !== void 0 ? _b : '');
                }
                var sumId = extractFieldIdFromElement(sumElements[i]);
                if (sumId) {
                    setFieldValue(sumId, (_c = row.sum) !== null && _c !== void 0 ? _c : '0.00');
                }
            }
            updateEigenleistungTotal();
        }
        function captureFremdleistungRows() {
            var bezeichnungElements = collectFieldElements('fremdleistung_bezeichnung');
            var rechnungElements = collectFieldElements('fremdleistung_rechnung');
            var sumElements = collectFieldElements('fremdleistung_summe');
            var rowCount = Math.max(bezeichnungElements.length, rechnungElements.length, sumElements.length);
            var rows = [];
            for (var i = 0; i < rowCount; i++) {
                var bezEl = bezeichnungElements[i];
                var rechEl = rechnungElements[i];
                var sumEl = sumElements[i];
                rows.push({
                    bezeichnung: bezEl ? (bezEl.value || bezEl.getAttribute('value') || '') : '',
                    rechnung: rechEl ? (rechEl.value || rechEl.getAttribute('value') || '') : '',
                    sum: sumEl ? (sumEl.value || sumEl.getAttribute('value') || '0.00') : '0.00'
                });
            }
            return rows;
        }
        function applyFremdleistungRows(rows) {
            var _a, _b, _c;
            var bezeichnungElements = collectFieldElements('fremdleistung_bezeichnung');
            var rechnungElements = collectFieldElements('fremdleistung_rechnung');
            var sumElements = collectFieldElements('fremdleistung_summe');
            var rowCount = Math.min(rows.length, bezeichnungElements.length, rechnungElements.length, sumElements.length);
            for (var i = 0; i < rowCount; i++) {
                var row = rows[i];
                var bezId = extractFieldIdFromElement(bezeichnungElements[i]);
                if (bezId) {
                    setFieldValue(bezId, (_a = row.bezeichnung) !== null && _a !== void 0 ? _a : '');
                }
                var rechId = extractFieldIdFromElement(rechnungElements[i]);
                if (rechId) {
                    setFieldValue(rechId, (_b = row.rechnung) !== null && _b !== void 0 ? _b : '');
                }
                var sumId = extractFieldIdFromElement(sumElements[i]);
                if (sumId) {
                    setFieldValue(sumId, (_c = row.sum) !== null && _c !== void 0 ? _c : '0.00');
                }
            }
        }
        function recalculateEigenleistungen() {
            var _a;
            var api = getHybridFormsAPI();
            var suffixes = [];
            var repeatingId = 'tab_eigenleistungen';
            if (fieldExists('eigenleistung_menge') || fieldExists('eigenleistung_ep')) {
                suffixes.push('');
            }
            var repeatingCount = 0;
            if ((_a = api === null || api === void 0 ? void 0 : api.RepeatingUnits) === null || _a === void 0 ? void 0 : _a.count) {
                try {
                    repeatingCount = api.RepeatingUnits.count(repeatingId) || 0;
                }
                catch (err) {
                    repeatingCount = 0;
                }
            }
            if (repeatingCount <= 0 && !suffixes.length) {
                repeatingCount = 1;
            }
            for (var idx = 1; idx <= repeatingCount; idx++) {
                var suffix = "_hfrepeating_".concat(idx);
                if (fieldExists("eigenleistung_menge".concat(suffix))
                    || fieldExists("eigenleistung_ep".concat(suffix))
                    || fieldExists("eigenleistung_summe".concat(suffix))) {
                    suffixes.push(suffix);
                }
            }
            suffixes.forEach(function (suffix) {
                var amountId = "eigenleistung_menge".concat(suffix);
                var epId = "eigenleistung_ep".concat(suffix);
                var sumId = "eigenleistung_summe".concat(suffix);
                if (!fieldExists(amountId) && !fieldExists(epId)) {
                    return;
                }
                var menge = getFieldValue(amountId);
                var einzelpreis = getFieldValue(epId);
                var summe = menge * einzelpreis;
                if (fieldExists(sumId)) {
                    setFieldValue(sumId, formatCurrency(summe));
                }
            });
            updateEigenleistungTotal();
        }
        function registerRepeatingUnitEvents() {
            var _a, _b;
            var api = getHybridFormsAPI();
            var repeatingId = 'tab_eigenleistungen';
            var repeatingFremdId = 'tab_fremdleistungen';
            var scheduleApply = function (rows) {
                window.requestAnimationFrame(function () {
                    applyEigenleistungRows(rows);
                    recalculateEigenleistungen();
                });
            };
            var scheduleFremdApply = function (rows) {
                window.requestAnimationFrame(function () {
                    applyFremdleistungRows(rows);
                    scheduleFremdleistungUpdate();
                });
            };
            if ((_a = api === null || api === void 0 ? void 0 : api.RepeatingUnits) === null || _a === void 0 ? void 0 : _a.addEventListener) {
                api.RepeatingUnits.addEventListener(repeatingId, 'beforeadd', function (index) {
                    cachedEigenleistungRows = captureEigenleistungRows();
                    pendingAddIndex = index;
                });
                api.RepeatingUnits.addEventListener(repeatingId, 'beforeremove', function (index) {
                    cachedEigenleistungRows = captureEigenleistungRows();
                    pendingRemoveIndex = index;
                });
                api.RepeatingUnits.addEventListener(repeatingId, 'added', function (index) {
                    var _a;
                    var rows = cachedEigenleistungRows.length ? __spreadArray([], cachedEigenleistungRows, true) : captureEigenleistungRows();
                    var insertIndex = (_a = index !== null && index !== void 0 ? index : pendingAddIndex) !== null && _a !== void 0 ? _a : rows.length;
                    var safeIndex = Math.max(0, Math.min(insertIndex, rows.length));
                    rows.splice(safeIndex, 0, { menge: '', ep: '', sum: '0.00' });
                    cachedEigenleistungRows = [];
                    pendingAddIndex = null;
                    scheduleApply(rows);
                });
                api.RepeatingUnits.addEventListener(repeatingId, 'removed', function (index) {
                    var _a;
                    var rows = cachedEigenleistungRows.length ? __spreadArray([], cachedEigenleistungRows, true) : captureEigenleistungRows();
                    var removeIndex = (_a = index !== null && index !== void 0 ? index : pendingRemoveIndex) !== null && _a !== void 0 ? _a : -1;
                    if (removeIndex >= 0 && removeIndex < rows.length) {
                        rows.splice(removeIndex, 1);
                    }
                    cachedEigenleistungRows = [];
                    pendingRemoveIndex = null;
                    scheduleApply(rows);
                });
                api.RepeatingUnits.addEventListener(repeatingFremdId, 'beforeadd', function (index) {
                    cachedFremdleistungRows = captureFremdleistungRows();
                    pendingFremdAddIndex = index;
                });
                api.RepeatingUnits.addEventListener(repeatingFremdId, 'beforeremove', function (index) {
                    cachedFremdleistungRows = captureFremdleistungRows();
                    pendingFremdRemoveIndex = index;
                });
                api.RepeatingUnits.addEventListener(repeatingFremdId, 'added', function (index) {
                    var _a;
                    var rows = cachedFremdleistungRows.length ? __spreadArray([], cachedFremdleistungRows, true) : captureFremdleistungRows();
                    var insertIndex = (_a = index !== null && index !== void 0 ? index : pendingFremdAddIndex) !== null && _a !== void 0 ? _a : rows.length;
                    var safeIndex = Math.max(0, Math.min(insertIndex, rows.length));
                    rows.splice(safeIndex, 0, { bezeichnung: '', rechnung: '', sum: '0.00' });
                    cachedFremdleistungRows = [];
                    pendingFremdAddIndex = null;
                    scheduleFremdApply(rows);
                });
                api.RepeatingUnits.addEventListener(repeatingFremdId, 'removed', function (index) {
                    var _a;
                    var rows = cachedFremdleistungRows.length ? __spreadArray([], cachedFremdleistungRows, true) : captureFremdleistungRows();
                    var removeIndex = (_a = index !== null && index !== void 0 ? index : pendingFremdRemoveIndex) !== null && _a !== void 0 ? _a : -1;
                    if (removeIndex >= 0 && removeIndex < rows.length) {
                        rows.splice(removeIndex, 1);
                    }
                    cachedFremdleistungRows = [];
                    pendingFremdRemoveIndex = null;
                    scheduleFremdApply(rows);
                });
            }
            if ((_b = api === null || api === void 0 ? void 0 : api.Page) === null || _b === void 0 ? void 0 : _b.addEventListener) {
                api.Page.addEventListener('rendered', function () { return window.requestAnimationFrame(function () { return recalculateEigenleistungen(); }); });
                api.Page.addEventListener('viewrendered', function () { return window.requestAnimationFrame(function () { return recalculateEigenleistungen(); }); });
            }
        }
        function updateEigenleistungTotal() {
            var inputs = Array.from(document.querySelectorAll('[data-hf-id^="eigenleistung_summe" i], input[id^="eigenleistung_summe" i]'));
            var total = 0;
            inputs.forEach(function (input) {
                total += parseDecimal(input.value || input.getAttribute('value'));
            });
            var totalFormatted = formatCurrency(total);
            setFieldValue('summe_eigenleistungen', totalFormatted);
            berechnungsManager.calculateGrandTotal();
        }
        function calculateEigenleistungRowRepeatable(value, ctrl) {
            recalculateEigenleistungen();
        }
        BehebungsprotokollHelper.calculateEigenleistungRowRepeatable = calculateEigenleistungRowRepeatable;
        var eigenleistungUpdateQueued = false;
        var fremdleistungUpdateQueued = false;
        function updateEigenleistungIndices() {
            eigenleistungUpdateQueued = false;
            var indexInputs = collectFieldElements('eigenleistung_index');
            if (!indexInputs.length) {
                return;
            }
            indexInputs.forEach(function (input, idx) {
                var newValue = String(idx + 1);
                var fieldId = extractFieldIdFromElement(input);
                if (!fieldId) {
                    return;
                }
                if (input.value !== newValue) {
                    input.value = newValue;
                    input.setAttribute('value', newValue);
                }
                setFieldValue(fieldId, newValue);
            });
            recalculateEigenleistungen();
        }
        function scheduleEigenleistungUpdate() {
            if (eigenleistungUpdateQueued) {
                return;
            }
            eigenleistungUpdateQueued = true;
            window.requestAnimationFrame(updateEigenleistungIndices);
        }
        function updateFremdleistungIndices() {
            fremdleistungUpdateQueued = false;
            var indexInputs = collectFieldElements('fremdleistung_index');
            if (!indexInputs.length) {
                return;
            }
            indexInputs.forEach(function (input, idx) {
                var newValue = String(idx + 1);
                var fieldId = extractFieldIdFromElement(input);
                if (!fieldId) {
                    return;
                }
                if (input.value !== newValue) {
                    input.value = newValue;
                    input.setAttribute('value', newValue);
                }
                setFieldValue(fieldId, newValue);
            });
        }
        function scheduleFremdleistungUpdate() {
            if (fremdleistungUpdateQueued) {
                return;
            }
            fremdleistungUpdateQueued = true;
            window.requestAnimationFrame(updateFremdleistungIndices);
        }
        function observeEigenleistungen() {
            scheduleEigenleistungUpdate();
            scheduleFremdleistungUpdate();
            var observer = new MutationObserver(function (mutations) {
                for (var _i = 0, mutations_1 = mutations; _i < mutations_1.length; _i++) {
                    var mutation = mutations_1[_i];
                    if (mutation.type !== 'childList') {
                        continue;
                    }
                    var addedRelevant = Array.from(mutation.addedNodes).some(function (node) {
                        return node instanceof HTMLElement && !!node.querySelector('input[id^="eigenleistung_index" i], input[id^="fremdleistung_index" i]');
                    });
                    var removedRelevant = Array.from(mutation.removedNodes).some(function (node) {
                        return node instanceof HTMLElement && !!node.querySelector('input[id^="eigenleistung_index" i], input[id^="fremdleistung_index" i]');
                    });
                    if (addedRelevant || removedRelevant) {
                        scheduleEigenleistungUpdate();
                        scheduleFremdleistungUpdate();
                        return;
                    }
                }
            });
            observer.observe(document.body, { childList: true, subtree: true });
        }
        function initialize() {
            registerRepeatingUnitEvents();
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', observeEigenleistungen, { once: true });
            }
            else {
                observeEigenleistungen();
            }
        }
        initialize();
        if (typeof WinJS !== 'undefined' && WinJS.Utilities && WinJS.Utilities.markSupportedForProcessing) {
            WinJS.Utilities.markSupportedForProcessing(HFFormdefinition.BehebungsprotokollHelper.calculateEigenleistungRowRepeatable);
        }
    })(BehebungsprotokollHelper = HFFormdefinition.BehebungsprotokollHelper || (HFFormdefinition.BehebungsprotokollHelper = {}));
})(HFFormdefinition || (HFFormdefinition = {}));
