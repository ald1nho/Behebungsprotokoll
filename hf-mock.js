// Mock HybridForms Runtime for local development
class MockHybridFormsRuntime {
    constructor() {
        console.log('Initializing Mock HybridForms Runtime...');
        this.initMockRuntime();
    }
    
    initMockRuntime() {
        // Create mock HybridForms API
        if (typeof window.HFWinJSCtrl === 'undefined') {
            window.HFWinJSCtrl = {};
            this.initializeControls();
        }
    }
    
    initializeControls() {
        // Process all data-hf-control elements after DOM is loaded
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                setTimeout(() => this.processControls(), 500);
            });
        } else {
            // DOM is already ready, process immediately but with a slight delay
            setTimeout(() => this.processControls(), 500);
        }
    }
    
    async processControls() {
        console.log('Processing HybridForms controls...');
        const controls = document.querySelectorAll('[data-hf-control]');
        console.log(`Found ${controls.length} HybridForms controls`);
        
        for (const element of controls) {
            const controlType = element.getAttribute('data-hf-control');
            const options = this.parseOptions(element.getAttribute('data-hf-options'));
            
            console.log(`Creating ${controlType} control:`, element.id, options);
            await this.createControl(element, controlType, options);
        }
    }
    
    parseOptions(optionsString) {
        try {
            return JSON.parse(optionsString || '{}');
        } catch (e) {
            console.warn('Failed to parse options:', optionsString, e);
            return {};
        }
    }
    
    async createControl(element, controlType, options) {
        try {
            switch (controlType) {
                case 'ComboBox':
                    await this.createComboBox(element, options);
                    break;
                case 'TextField':
                    this.createTextField(element, options);
                    break;
                case 'NumberField':
                    this.createNumberField(element, options);
                    break;
                case 'DateTimePicker':
                    this.createDateTimePicker(element, options);
                    break;
                case 'Signature':
                    this.createSignature(element, options);
                    break;
                default:
                    console.warn('Unknown control type:', controlType);
            }
        } catch (error) {
            console.error(`Error creating ${controlType}:`, error);
        }
    }
    
    async createComboBox(element, options) {
        console.log('Creating ComboBox:', element.id, options);
        
        const select = document.createElement('select');
        select.id = element.id;
        select.name = element.id;
        select.required = options.required || false;
        select.className = 'hf-combobox form-control';
        select.style.cssText = 'width: 100%; padding: 12px; border: 1px solid #ddd; border-radius: 4px; font-size: 16px;';
        
        // Add placeholder
        if (options.placeholder) {
            const placeholderOption = document.createElement('option');
            placeholderOption.value = '';
            placeholderOption.textContent = options.placeholder;
            placeholderOption.disabled = true;
            placeholderOption.selected = true;
            select.appendChild(placeholderOption);
        }
        
        // Load data from URL
        if (options.url) {
            try {
                console.log('Loading catalog from:', `http://localhost:8183${options.url}`);
                const response = await fetch(`http://localhost:8183${options.url}`, {
                    method: 'GET',
                    mode: 'cors',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                });
                
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                
                const data = await response.json();
                console.log('Loaded catalog data for', element.id, ':', data);
                
                if (Array.isArray(data) && data.length > 0) {
                    data.forEach((item, index) => {
                        const option = document.createElement('option');
                        option.value = item[options.dataValueField || 'ID'];
                        option.textContent = item[options.dataTextField || 'Name'];
                        select.appendChild(option);
                        console.log(`Added option ${index + 1}:`, option.value, option.textContent);
                    });
                    
                    console.log('ComboBox', element.id, 'created successfully with', data.length, 'options');
                    console.log('Final select element:', select);
                    console.log('Options count in select:', select.options.length);
                } else {
                    console.error('No data or invalid data format for', element.id, data);
                    // Add no data option
                    const noDataOption = document.createElement('option');
                    noDataOption.value = '';
                    noDataOption.textContent = 'Keine Daten verfügbar';
                    noDataOption.disabled = true;
                    select.appendChild(noDataOption);
                }
                
            } catch (error) {
                console.error('Failed to load catalog data for', element.id, ':', error);
                // Add error option
                const errorOption = document.createElement('option');
                errorOption.value = '';
                errorOption.textContent = 'Fehler beim Laden der Daten';
                errorOption.disabled = true;
                select.appendChild(errorOption);
            }
        }
        
        // Replace the div with select
        console.log('Replacing element:', element, 'with select:', select);
        element.parentNode.replaceChild(select, element);
        console.log('Element replaced successfully for', select.id);
    }
    
    createTextField(element, options) {
        if (element.tagName === 'INPUT') {
            element.required = options.required || false;
            element.placeholder = options.placeholder || '';
            console.log('TextField configured:', element.id);
        }
    }
    
    createNumberField(element, options) {
        if (element.tagName === 'INPUT') {
            element.type = 'number';
            element.step = options.step || 'any';
            element.min = options.min || '';
            element.placeholder = options.placeholder || '';
            element.required = options.required || false;
            console.log('NumberField configured:', element.id);
        }
    }
    
    createDateTimePicker(element, options) {
        if (element.tagName === 'INPUT') {
            element.type = 'date';
            element.required = options.required || false;
            console.log('DateTimePicker configured:', element.id);
        }
    }
    
    createSignature(element, options) {
        console.log('Creating Signature pad:', element.id);
        
        element.innerHTML = ''; // Clear existing content
        
        const canvas = document.createElement('canvas');
        canvas.id = element.id + '_canvas';
        canvas.width = 400;
        canvas.height = 200;
        canvas.style.cssText = 'border: 2px solid #ddd; border-radius: 4px; background: white; cursor: crosshair; display: block; margin: 0 auto;';
        
        // Simple drawing functionality
        let isDrawing = false;
        const ctx = canvas.getContext('2d');
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;
        
        const startDrawing = (e) => {
            isDrawing = true;
            ctx.beginPath();
            const rect = canvas.getBoundingClientRect();
            ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
        };
        
        const draw = (e) => {
            if (!isDrawing) return;
            const rect = canvas.getBoundingClientRect();
            ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
            ctx.stroke();
        };
        
        const stopDrawing = () => {
            isDrawing = false;
        };
        
        // Mouse events
        canvas.addEventListener('mousedown', startDrawing);
        canvas.addEventListener('mousemove', draw);
        canvas.addEventListener('mouseup', stopDrawing);
        canvas.addEventListener('mouseout', stopDrawing);
        
        // Touch events for mobile
        canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            const mouseEvent = new MouseEvent('mousedown', {
                clientX: touch.clientX,
                clientY: touch.clientY
            });
            canvas.dispatchEvent(mouseEvent);
        });
        
        canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            const mouseEvent = new MouseEvent('mousemove', {
                clientX: touch.clientX,
                clientY: touch.clientY
            });
            canvas.dispatchEvent(mouseEvent);
        });
        
        canvas.addEventListener('touchend', (e) => {
            e.preventDefault();
            const mouseEvent = new MouseEvent('mouseup', {});
            canvas.dispatchEvent(mouseEvent);
        });
        
        // Clear function
        canvas.clear = function() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        };
        
        element.appendChild(canvas);
        
        // Store canvas reference for later use
        element.winControl = {
            clear: () => canvas.clear(),
            isEmpty: () => {
                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                return imageData.data.every(pixel => pixel === 0);
            },
            getImageData: () => canvas.toDataURL()
        };
        
        console.log('Signature pad created successfully');
    }
}

// Initialize Mock Runtime
console.log('Loading Mock HybridForms Runtime...');
window.mockHybridForms = new MockHybridFormsRuntime();

// Also expose processControls globally for debugging
window.debugProcessControls = () => {
    if (window.mockHybridForms) {
        return window.mockHybridForms.processControls();
    }
};