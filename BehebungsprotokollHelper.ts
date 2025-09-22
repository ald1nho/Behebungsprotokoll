// Behebungsprotokoll TypeScript Helper - Einfache funktionierende Version

namespace HFFormdefinition.BehebungsprotokollHelper {
    // Global Calculation Manager
    export class BerechnungsManager {
        constructor() {
            // Initialisierung
        }

        public calculateGrandTotal(): void {
            const eigenleistungInput = document.getElementById('summe_eigenleistungen') as HTMLInputElement;
            const fremdleistungInput = document.getElementById('summe_fremdleistungen_brutto') as HTMLInputElement;
            
            const eigenleistung = eigenleistungInput
                ? ((isFinite(eigenleistungInput.valueAsNumber) ? eigenleistungInput.valueAsNumber : parseFloat(eigenleistungInput.value.replace(',', '.'))) || 0)
                : 0;
            const fremdleistung = fremdleistungInput
                ? ((isFinite(fremdleistungInput.valueAsNumber) ? fremdleistungInput.valueAsNumber : parseFloat(fremdleistungInput.value.replace(',', '.'))) || 0)
                : 0;
            const gesamt = eigenleistung + fremdleistung;
            
            const summaryEigenleistungInput = document.getElementById('summary_eigenleistung') as HTMLInputElement;
            const summaryFremdleistungInput = document.getElementById('summary_fremdleistung') as HTMLInputElement;
            const summaryGesamtInput = document.getElementById('summary_gesamt') as HTMLInputElement;
            
            if (summaryEigenleistungInput) summaryEigenleistungInput.value = eigenleistung.toFixed(2);
            if (summaryFremdleistungInput) summaryFremdleistungInput.value = fremdleistung.toFixed(2);
            if (summaryGesamtInput) summaryGesamtInput.value = gesamt.toFixed(2);
            
            // Auto-check fotos if >= 1500
            const fotosCheckbox = document.getElementById('beilage_fotos') as HTMLInputElement;
            if (fotosCheckbox && gesamt >= 1500) {
                fotosCheckbox.checked = true;
            }
        }
    }

    const berechnungsManager = new BerechnungsManager();

    function getHybridForms(): any | null {
        const globalObj = window as unknown as { HybridForms?: any };
        return globalObj && globalObj.HybridForms ? globalObj.HybridForms : null;
    }

    function getHybridFormsAPI(): any | null {
        const hf = getHybridForms();
        return hf && hf.API ? hf.API : null;
    }

    function parseDecimal(value: string | number | null | undefined): number {
        if (value === null || value === undefined) {
            return 0;
        }
        if (typeof value === 'number' && isFinite(value)) {
            return value;
        }
        const normalized = String(value).replace(/\s+/g, '').replace(/,/g, '.');
        const parsed = parseFloat(normalized);
        return isNaN(parsed) ? 0 : parsed;
    }

    function formatCurrency(value: number): string {
        if (!isFinite(value)) {
            return '0.00';
        }
        return value.toFixed(2);
    }

    function normalizeFieldId(rawId: string | null | undefined): string {
        if (!rawId) {
            return '';
        }
        return rawId.replace(/^hf-formcontrol-/i, '');
    }

    function getFieldElement(fieldId: string): HTMLInputElement | null {
        if (!fieldId) {
            return null;
        }

        const direct = document.getElementById(fieldId) as HTMLInputElement | null;
        if (direct) {
            return direct;
        }

        return document.querySelector<HTMLInputElement>(`[data-hf-id="${fieldId}"]`);
    }

    function extractFieldIdFromElement(element: HTMLElement | null | undefined): string {
        if (!element) {
            return '';
        }

        const candidates = [
            (element.dataset && element.dataset.hfId) || undefined,
            (element.dataset && (element.dataset as Record<string, string>).hfFieldId) || undefined,
            element.getAttribute ? element.getAttribute('data-hf-id') || undefined : undefined,
            element.id || undefined,
        ];

        for (const candidate of candidates) {
            const normalized = normalizeFieldId(candidate);
            if (normalized) {
                return normalized;
            }
        }

        const nested = element.querySelector<HTMLElement>('[data-hf-id], input[id]');
        if (nested) {
            return extractFieldIdFromElement(nested);
        }

        return '';
    }

    function extractSuffixFromFieldId(fieldId: string, baseId: string): string {
        if (!fieldId) {
            return '';
        }
        const normalized = normalizeFieldId(fieldId);
        const regex = new RegExp(`^${baseId.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&')}(.*)$`, 'i');
        const match = normalized.match(regex);
        return match ? match[1] : '';
    }

    function fieldExists(fieldId: string): boolean {
        const api = getHybridFormsAPI();
        if (api?.Fields?.getById) {
            const field = api.Fields.getById(fieldId);
            if (field) {
                return true;
            }
        }
        if (document.getElementById(fieldId)) {
            return true;
        }
        return !!document.querySelector(`[data-hf-id="${fieldId}"]`);
    }

    function getFieldValue(fieldId: string): number {
        const api = getHybridFormsAPI();
        if (api?.Fields?.getById) {
            const field = api.Fields.getById(fieldId);
            if (field && field.value !== undefined && field.value !== null) {
                return parseDecimal(field.value as string | number);
            }
        }

        const element = getFieldElement(fieldId);
        if (element) {
            return parseDecimal(element.value || element.getAttribute('value'));
        }

        return 0;
    }

    function setFieldValue(fieldId: string, value: string): void {
        const api = getHybridFormsAPI();
        if (api?.Fields?.setField) {
            try {
                api.Fields.setField(fieldId, value);
            } catch (err) {
                // ignore when field does not exist
            }
        }

        const element = getFieldElement(fieldId);
        if (element) {
            element.value = value;
            element.setAttribute('value', value);
        }
    }

    function collectFieldElements(baseId: string): HTMLInputElement[] {
        const selectors = [
            `[data-hf-id^="${baseId}" i]`,
            `input[id^="${baseId}" i]`
        ];
        const elements: HTMLInputElement[] = [];
        const seen = new Set<string>();

        selectors.forEach(selector => {
            document.querySelectorAll<HTMLInputElement>(selector).forEach(element => {
                const fieldId = extractFieldIdFromElement(element);
                if (!fieldId || seen.has(fieldId)) {
                    return;
                }
                seen.add(fieldId);
                elements.push(element);
            });
        });

        return elements;
    }

    interface EigenleistungRowData {
        menge: string;
        ep: string;
        sum: string;
    }

    interface FremdleistungRowData {
        bezeichnung: string;
        rechnung: string;
        sum: string;
    }

    let cachedEigenleistungRows: EigenleistungRowData[] = [];
    let pendingAddIndex: number | null = null;
    let pendingRemoveIndex: number | null = null;
    let cachedFremdleistungRows: FremdleistungRowData[] = [];
    let pendingFremdAddIndex: number | null = null;
    let pendingFremdRemoveIndex: number | null = null;

    function captureEigenleistungRows(): EigenleistungRowData[] {
        const mengeElements = collectFieldElements('eigenleistung_menge');
        const epElements = collectFieldElements('eigenleistung_ep');
        const sumElements = collectFieldElements('eigenleistung_summe');
        const rowCount = Math.max(mengeElements.length, epElements.length, sumElements.length);
        const rows: EigenleistungRowData[] = [];

        for (let i = 0; i < rowCount; i++) {
            const mengeEl = mengeElements[i];
            const epEl = epElements[i];
            const sumEl = sumElements[i];

            rows.push({
                menge: mengeEl ? (mengeEl.value || mengeEl.getAttribute('value') || '') : '',
                ep: epEl ? (epEl.value || epEl.getAttribute('value') || '') : '',
                sum: sumEl ? (sumEl.value || sumEl.getAttribute('value') || '0.00') : '0.00'
            });
        }

        return rows;
    }

    function applyEigenleistungRows(rows: EigenleistungRowData[]): void {
        const mengeElements = collectFieldElements('eigenleistung_menge');
        const epElements = collectFieldElements('eigenleistung_ep');
        const sumElements = collectFieldElements('eigenleistung_summe');
        const rowCount = Math.min(rows.length, mengeElements.length, epElements.length, sumElements.length);

        for (let i = 0; i < rowCount; i++) {
            const row = rows[i];

            const mengeId = extractFieldIdFromElement(mengeElements[i]);
            if (mengeId) {
                setFieldValue(mengeId, row.menge ?? '');
            }

            const epId = extractFieldIdFromElement(epElements[i]);
            if (epId) {
                setFieldValue(epId, row.ep ?? '');
            }

            const sumId = extractFieldIdFromElement(sumElements[i]);
            if (sumId) {
                setFieldValue(sumId, row.sum ?? '0.00');
            }
        }

        updateEigenleistungTotal();
    }

    function captureFremdleistungRows(): FremdleistungRowData[] {
        const bezeichnungElements = collectFieldElements('fremdleistung_bezeichnung');
        const rechnungElements = collectFieldElements('fremdleistung_rechnung');
        const sumElements = collectFieldElements('fremdleistung_summe');
        const rowCount = Math.max(bezeichnungElements.length, rechnungElements.length, sumElements.length);
        const rows: FremdleistungRowData[] = [];

        for (let i = 0; i < rowCount; i++) {
            const bezEl = bezeichnungElements[i];
            const rechEl = rechnungElements[i];
            const sumEl = sumElements[i];

            rows.push({
                bezeichnung: bezEl ? (bezEl.value || bezEl.getAttribute('value') || '') : '',
                rechnung: rechEl ? (rechEl.value || rechEl.getAttribute('value') || '') : '',
                sum: sumEl ? (sumEl.value || sumEl.getAttribute('value') || '0.00') : '0.00'
            });
        }

        return rows;
    }

    function applyFremdleistungRows(rows: FremdleistungRowData[]): void {
        const bezeichnungElements = collectFieldElements('fremdleistung_bezeichnung');
        const rechnungElements = collectFieldElements('fremdleistung_rechnung');
        const sumElements = collectFieldElements('fremdleistung_summe');
        const rowCount = Math.min(rows.length, bezeichnungElements.length, rechnungElements.length, sumElements.length);

        for (let i = 0; i < rowCount; i++) {
            const row = rows[i];

            const bezId = extractFieldIdFromElement(bezeichnungElements[i]);
            if (bezId) {
                setFieldValue(bezId, row.bezeichnung ?? '');
            }

            const rechId = extractFieldIdFromElement(rechnungElements[i]);
            if (rechId) {
                setFieldValue(rechId, row.rechnung ?? '');
            }

            const sumId = extractFieldIdFromElement(sumElements[i]);
            if (sumId) {
                setFieldValue(sumId, row.sum ?? '0.00');
            }
        }
    }

    function recalculateEigenleistungen(): void {
        const api = getHybridFormsAPI();
        const suffixes: string[] = [];
        const repeatingId = 'tab_eigenleistungen';

        if (fieldExists('eigenleistung_menge') || fieldExists('eigenleistung_ep')) {
            suffixes.push('');
        }

        let repeatingCount = 0;
        if (api?.RepeatingUnits?.count) {
            try {
                repeatingCount = api.RepeatingUnits.count(repeatingId) || 0;
            } catch (err) {
                repeatingCount = 0;
            }
        }

        if (repeatingCount <= 0 && !suffixes.length) {
            repeatingCount = 1;
        }

        for (let idx = 1; idx <= repeatingCount; idx++) {
            const suffix = `_hfrepeating_${idx}`;
            if (fieldExists(`eigenleistung_menge${suffix}`)
                || fieldExists(`eigenleistung_ep${suffix}`)
                || fieldExists(`eigenleistung_summe${suffix}`)) {
                suffixes.push(suffix);
            }
        }

        suffixes.forEach(suffix => {
            const amountId = `eigenleistung_menge${suffix}`;
            const epId = `eigenleistung_ep${suffix}`;
            const sumId = `eigenleistung_summe${suffix}`;

            if (!fieldExists(amountId) && !fieldExists(epId)) {
                return;
            }

            const menge = getFieldValue(amountId);
            const einzelpreis = getFieldValue(epId);
            const summe = menge * einzelpreis;

            if (fieldExists(sumId)) {
                setFieldValue(sumId, formatCurrency(summe));
            }
        });

        updateEigenleistungTotal();
    }

    function registerRepeatingUnitEvents(): void {
        const api = getHybridFormsAPI();
        const repeatingId = 'tab_eigenleistungen';
        const repeatingFremdId = 'tab_fremdleistungen';

        const scheduleApply = (rows: EigenleistungRowData[]) => {
            window.requestAnimationFrame(() => {
                applyEigenleistungRows(rows);
                recalculateEigenleistungen();
            });
        };

        const scheduleFremdApply = (rows: FremdleistungRowData[]) => {
            window.requestAnimationFrame(() => {
                applyFremdleistungRows(rows);
                scheduleFremdleistungUpdate();
            });
        };

        if (api?.RepeatingUnits?.addEventListener) {
            api.RepeatingUnits.addEventListener(repeatingId, 'beforeadd', (index: number) => {
                cachedEigenleistungRows = captureEigenleistungRows();
                pendingAddIndex = index;
            });

            api.RepeatingUnits.addEventListener(repeatingId, 'beforeremove', (index: number) => {
                cachedEigenleistungRows = captureEigenleistungRows();
                pendingRemoveIndex = index;
            });

            api.RepeatingUnits.addEventListener(repeatingId, 'added', (index: number) => {
                const rows = cachedEigenleistungRows.length ? [...cachedEigenleistungRows] : captureEigenleistungRows();
                const insertIndex = index ?? pendingAddIndex ?? rows.length;
                const safeIndex = Math.max(0, Math.min(insertIndex, rows.length));
                rows.splice(safeIndex, 0, { menge: '', ep: '', sum: '0.00' });
                cachedEigenleistungRows = [];
                pendingAddIndex = null;
                scheduleApply(rows);
            });

            api.RepeatingUnits.addEventListener(repeatingId, 'removed', (index: number) => {
                const rows = cachedEigenleistungRows.length ? [...cachedEigenleistungRows] : captureEigenleistungRows();
                const removeIndex = index ?? pendingRemoveIndex ?? -1;
                if (removeIndex >= 0 && removeIndex < rows.length) {
                    rows.splice(removeIndex, 1);
                }
                cachedEigenleistungRows = [];
                pendingRemoveIndex = null;
                scheduleApply(rows);
            });

            api.RepeatingUnits.addEventListener(repeatingFremdId, 'beforeadd', (index: number) => {
                cachedFremdleistungRows = captureFremdleistungRows();
                pendingFremdAddIndex = index;
            });

            api.RepeatingUnits.addEventListener(repeatingFremdId, 'beforeremove', (index: number) => {
                cachedFremdleistungRows = captureFremdleistungRows();
                pendingFremdRemoveIndex = index;
            });

            api.RepeatingUnits.addEventListener(repeatingFremdId, 'added', (index: number) => {
                const rows = cachedFremdleistungRows.length ? [...cachedFremdleistungRows] : captureFremdleistungRows();
                const insertIndex = index ?? pendingFremdAddIndex ?? rows.length;
                const safeIndex = Math.max(0, Math.min(insertIndex, rows.length));
                rows.splice(safeIndex, 0, { bezeichnung: '', rechnung: '', sum: '0.00' });
                cachedFremdleistungRows = [];
                pendingFremdAddIndex = null;
                scheduleFremdApply(rows);
            });

            api.RepeatingUnits.addEventListener(repeatingFremdId, 'removed', (index: number) => {
                const rows = cachedFremdleistungRows.length ? [...cachedFremdleistungRows] : captureFremdleistungRows();
                const removeIndex = index ?? pendingFremdRemoveIndex ?? -1;
                if (removeIndex >= 0 && removeIndex < rows.length) {
                    rows.splice(removeIndex, 1);
                }
                cachedFremdleistungRows = [];
                pendingFremdRemoveIndex = null;
                scheduleFremdApply(rows);
            });
        }

        if (api?.Page?.addEventListener) {
            api.Page.addEventListener('rendered', () => window.requestAnimationFrame(() => recalculateEigenleistungen()));
            api.Page.addEventListener('viewrendered', () => window.requestAnimationFrame(() => recalculateEigenleistungen()));
        }
    }

    function updateEigenleistungTotal(): void {
        const inputs = Array.from(
            document.querySelectorAll<HTMLInputElement>(
                '[data-hf-id^="eigenleistung_summe" i], input[id^="eigenleistung_summe" i]'
            )
        );
        let total = 0;
        inputs.forEach(input => {
            total += parseDecimal(input.value || input.getAttribute('value'));
        });

        const totalFormatted = formatCurrency(total);
        setFieldValue('summe_eigenleistungen', totalFormatted);
        berechnungsManager.calculateGrandTotal();
    }

    export function calculateEigenleistungRowRepeatable(value?: unknown, ctrl?: any): void {
        recalculateEigenleistungen();
    }

    let eigenleistungUpdateQueued = false;
    let fremdleistungUpdateQueued = false;

    function updateEigenleistungIndices(): void {
        eigenleistungUpdateQueued = false;
        const indexInputs = collectFieldElements('eigenleistung_index');
        if (!indexInputs.length) {
            return;
        }

        indexInputs.forEach((input, idx) => {
            const newValue = String(idx + 1);
            const fieldId = extractFieldIdFromElement(input);
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

    function scheduleEigenleistungUpdate(): void {
        if (eigenleistungUpdateQueued) {
            return;
        }
        eigenleistungUpdateQueued = true;
        window.requestAnimationFrame(updateEigenleistungIndices);
    }

    function updateFremdleistungIndices(): void {
        fremdleistungUpdateQueued = false;
        const indexInputs = collectFieldElements('fremdleistung_index');
        if (!indexInputs.length) {
            return;
        }

        indexInputs.forEach((input, idx) => {
            const newValue = String(idx + 1);
            const fieldId = extractFieldIdFromElement(input);
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

    function scheduleFremdleistungUpdate(): void {
        if (fremdleistungUpdateQueued) {
            return;
        }
        fremdleistungUpdateQueued = true;
        window.requestAnimationFrame(updateFremdleistungIndices);
    }

    function observeEigenleistungen(): void {
        scheduleEigenleistungUpdate();
        scheduleFremdleistungUpdate();
        const observer = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                if (mutation.type !== 'childList') {
                    continue;
                }
                const addedRelevant = Array.from(mutation.addedNodes).some(node =>
                    node instanceof HTMLElement && !!node.querySelector('input[id^="eigenleistung_index" i], input[id^="fremdleistung_index" i]'));
                const removedRelevant = Array.from(mutation.removedNodes).some(node =>
                    node instanceof HTMLElement && !!node.querySelector('input[id^="eigenleistung_index" i], input[id^="fremdleistung_index" i]'));
                if (addedRelevant || removedRelevant) {
                    scheduleEigenleistungUpdate();
                    scheduleFremdleistungUpdate();
                    return;
                }
            }
        });
        observer.observe(document.body, { childList: true, subtree: true });
    }

    function initialize(): void {
        registerRepeatingUnitEvents();
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', observeEigenleistungen, { once: true });
        } else {
            observeEigenleistungen();
        }
    }

    initialize();

    if (typeof WinJS !== 'undefined' && WinJS.Utilities && WinJS.Utilities.markSupportedForProcessing) {
        WinJS.Utilities.markSupportedForProcessing(HFFormdefinition.BehebungsprotokollHelper.calculateEigenleistungRowRepeatable);
    }
}
