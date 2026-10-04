/**
 * jsdom no implementa `<dialog>` (`showModal`, `close`, ...), así que los
 * diálogos de la aplicación no se pueden abrir en los tests.
 *
 * Este shim reproduce lo mínimo que usan `FormDialog` y `ConfirmDialog`:
 * abrir, cerrar y reflejar el atributo `open`.
 */
const dialog = globalThis.HTMLDialogElement;

if (dialog && typeof dialog.prototype.showModal !== 'function') {
  dialog.prototype.show = function (): void {
    this.open = true;
  };

  dialog.prototype.showModal = function (): void {
    this.open = true;
  };

  dialog.prototype.close = function (returnValue?: string): void {
    this.open = false;

    if (returnValue !== undefined) {
      this.returnValue = returnValue;
    }

    this.dispatchEvent(new Event('close'));
  };
}
