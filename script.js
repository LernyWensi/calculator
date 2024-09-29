const OPERATORS = Object.freeze({
    division: Symbol('division'),
    multiplication: Symbol('multiplication'),
    subtraction: Symbol('subtraction'),
    addition: Symbol('addition'),
});

const OPERATORS_SIGNS = Object.freeze(
    Object.entries(OPERATORS).reduce((object, [key, value]) => {
        const operatorSign = document.querySelector(`[data-operator="${key}"]`).textContent;
        return { ...object, [value]: operatorSign };
    }, {}),
);

const ACTIONS = Object.freeze({
    clear: Symbol('clear'),
    removeCharacter: Symbol('removeCharacter'),
    calculatePercentage: Symbol('calculatePercentage'),
    calculate: Symbol('calculate'),
    changeSign: Symbol('changeSign'),
    addDecimalPoint: Symbol('addDecimalPoint'),
});

const expression = new (class {
    firstOperand = null;
    secondOperand = null;
    operator = null;
    result = null;

    calculate() {
        switch (this.operator) {
            case OPERATORS.division:
                return expression.secondOperand === 0 ? null : this.firstOperand / this.secondOperand;

            case OPERATORS.multiplication:
                return this.firstOperand * this.secondOperand;

            case OPERATORS.subtraction:
                return this.firstOperand - this.secondOperand;

            case OPERATORS.addition:
                return this.firstOperand + this.secondOperand;
        }
    }

    calculatePercentage() {
        return (this.firstOperand * this.secondOperand) / 100;
    }

    isComplete() {
        return this.firstOperand !== null && this.secondOperand !== null && this.operator !== null;
    }

    reset() {
        this.firstOperand = null;
        this.secondOperand = null;
        this.operator = null;
        this.result = null;
    }
})();

const buffer = new (class {
    #value = '0';

    set(value) {
        this.#value = value.toString();
    }

    get() {
        return this.#value;
    }

    extract() {
        const value = this.#value;
        this.empty();
        return value;
    }

    addDigit(value) {
        value = value.toString();
        this.#value = this.isEmpty() || this.isReset() ? value : this.#value + value;
    }

    addDecimalPoint() {
        if (this.#value.includes('.')) return;
        if (this.isEmpty()) this.reset();
        this.#value += '.';
    }

    removeLastCharacter() {
        this.#value = this.#value.slice(0, -1);
        if (this.isEmpty()) this.reset();
    }

    changeSign() {
        if (this.isEmpty() || this.isReset()) return;
        this.#value = (this.#value * -1).toString();
    }

    reset() {
        this.#value = '0';
    }

    empty() {
        this.#value = '';
    }

    isReset() {
        return this.#value === '0';
    }

    isEmpty() {
        return this.#value === '';
    }
})();

const $displayBuffer = document.querySelector('#display-buffer');
const $displayExpression = document.querySelector('#display-expression');
const $calculatorButtons = document.querySelector('#calculator-buttons');

$calculatorButtons.addEventListener('click', onCalculatorButtonClick);
window.addEventListener('keydown', onKeydown);

function onCalculatorButtonClick(event) {
    const { digit, operator, action } = event.target.dataset;

    if (digit) handleDigitInput(digit);
    else if (operator) handleOperatorInput(OPERATORS[operator]);
    else if (action) handleActionInput(ACTIONS[action]);
}

function onKeydown(event) {
    switch (event.key) {
        case '/':
            handleOperatorInput(OPERATORS.division);
            break;
        case '*':
            handleOperatorInput(OPERATORS.multiplication);
            break;
        case '-':
            handleOperatorInput(OPERATORS.subtraction);
            break;
        case '+':
            handleOperatorInput(OPERATORS.addition);
            break;
        case 'c':
            handleActionInput(ACTIONS.clear);
            break;
        case 'Backspace':
            handleActionInput(ACTIONS.removeCharacter);
            break;
        case '%':
            handleActionInput(ACTIONS.calculatePercentage);
            break;
        case '=':
            handleActionInput(ACTIONS.calculate);
            break;
        case 's':
            handleActionInput(ACTIONS.changeSign);
            break;
        case '.':
            handleActionInput(ACTIONS.addDecimalPoint);
            break;
        case '0':
        case '1':
        case '2':
        case '3':
        case '4':
        case '5':
        case '6':
        case '7':
        case '8':
        case '9':
            handleDigitInput(event.key);
            break;
    }
}

function handleDigitInput(digit) {
    buffer.addDigit(digit);
    setDisplayBuffer(buffer.get());
    if (expression.isComplete()) $displayExpression.textContent = '';
}

function handleOperatorInput(operator) {
    if (expression.isComplete()) {
        if (!buffer.isEmpty()) expression.firstOperand = Number(buffer.extract());
        expression.secondOperand = null;
    }

    if (!buffer.isEmpty()) {
        const operand = Number(buffer.extract());
        if (expression.firstOperand === null) expression.firstOperand = operand;
        else expression.secondOperand = operand;
    }

    if (expression.isComplete()) {
        const result = expression.calculate();

        if (result === null) {
            buffer.reset();
            expression.reset();
            setDisplayBuffer(buffer.get());
            setDisplayExpressionForbidden();
            return;
        }

        expression.firstOperand = result;
        expression.secondOperand = null;
        setDisplayBuffer(expression.firstOperand);
    }

    expression.operator = operator;

    syncDisplayWithExpression();
}

function handleActionInput(action) {
    switch (action) {
        case ACTIONS.clear:
            buffer.reset();
            expression.reset();
            setDisplayBuffer(buffer.get());
            syncDisplayWithExpression();
            break;

        case ACTIONS.removeCharacter:
            buffer.removeLastCharacter();
            setDisplayBuffer(buffer.get());
            break;

        case ACTIONS.calculatePercentage:
            if (expression.operator === null) {
                buffer.empty();
                expression.firstOperand = 0;
                setDisplayBuffer(expression.firstOperand);
                syncDisplayWithExpression();
                break;
            }

            {
                const operand = buffer.isEmpty() ? expression.firstOperand : Number(buffer.extract());
                if (!expression.isComplete()) expression.secondOperand = operand;
                else expression.firstOperand = operand;
            }

            expression.secondOperand = expression.calculatePercentage();

            setDisplayBuffer(expression.secondOperand);
            syncDisplayWithExpression(false);
            break;

        case ACTIONS.calculate:
            const operand = buffer.isEmpty() ? expression.firstOperand : Number(buffer.extract());

            if (expression.operator === null) {
                expression.firstOperand = operand;
                setDisplayBuffer(expression.firstOperand);
                syncDisplayWithExpression(true);
                break;
            }

            if (!expression.isComplete()) expression.secondOperand = operand;
            else expression.firstOperand = operand;

            syncDisplayWithExpression();

            const result = expression.calculate();

            if (result === null) {
                buffer.reset();
                expression.reset();
                setDisplayBuffer(buffer.get());
                setDisplayExpressionForbidden();
                break;
            }

            expression.firstOperand = result;
            setDisplayBuffer(expression.firstOperand);
            break;

        case ACTIONS.changeSign:
            if (buffer.isEmpty()) buffer.set($displayBuffer.textContent);
            buffer.changeSign();
            setDisplayBuffer(buffer.get());
            break;

        case ACTIONS.addDecimalPoint:
            buffer.addDecimalPoint();
            setDisplayBuffer(buffer.get());
            break;
    }
}

function trimInsignificantZeroes(number) {
    const PRECISION = 3;
    return Number(Number(number).toFixed(PRECISION));
}

function setDisplayBuffer(value) {
    $displayBuffer.textContent = typeof value === 'string' ? value : trimInsignificantZeroes(value);
}

function setDisplayExpressionForbidden() {
    $displayExpression.textContent = 'Forbidden';
}

function syncDisplayWithExpression(shouldAppendEqualSign = false) {
    const firstOperand = expression.firstOperand !== null ? trimInsignificantZeroes(expression.firstOperand) : '';
    const secondOperand = expression.secondOperand !== null ? trimInsignificantZeroes(expression.secondOperand) : '';
    const operator = OPERATORS_SIGNS[expression.operator] || '';
    let equalSign = (firstOperand && secondOperand && operator) || shouldAppendEqualSign ? ' =' : '';
    $displayExpression.textContent = `${firstOperand} ${operator} ${secondOperand} ${equalSign}`;
}
