export type ToastType = "success" | "error" | "warning" | "info";

export interface ToastItem {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
}

export interface ConfirmOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "danger" | "warning" | "info" | "success";
  // Enhanced detail previews for Delete & Actions
  itemName?: string;
  itemType?: string;
  itemDetails?: string;
  warningNote?: string;
}

export interface ConfirmDeleteOptions {
  title?: string;
  itemName: string;
  itemType?: string;
  itemDetails?: string;
  message?: string;
  warningNote?: string;
  confirmText?: string;
  cancelText?: string;
}

export interface AlertOptions {
  title?: string;
  message: string;
  variant?: "danger" | "warning" | "info" | "success";
  buttonText?: string;
}

type ToastListener = (toasts: ToastItem[]) => void;
type ConfirmListener = (options: ConfirmOptions | null, resolve?: (val: boolean) => void) => void;
type AlertListener = (options: AlertOptions | null, resolve?: () => void) => void;

class NotificationManager {
  private toasts: ToastItem[] = [];
  private toastListeners: ToastListener[] = [];
  private confirmListener: ConfirmListener | null = null;
  private alertListener: AlertListener | null = null;

  // Subscribe toast state
  subscribeToasts(listener: ToastListener) {
    this.toastListeners.push(listener);
    listener(this.toasts);
    return () => {
      this.toastListeners = this.toastListeners.filter((l) => l !== listener);
    };
  }

  // Subscribe confirm state
  subscribeConfirm(listener: ConfirmListener) {
    this.confirmListener = listener;
    return () => {
      if (this.confirmListener === listener) this.confirmListener = null;
    };
  }

  // Subscribe alert state
  subscribeAlert(listener: AlertListener) {
    this.alertListener = listener;
    return () => {
      if (this.alertListener === listener) this.alertListener = null;
    };
  }

  private notifyToastListeners() {
    this.toastListeners.forEach((listener) => listener([...this.toasts]));
  }

  // TOAST API
  showToast(type: ToastType, title: string, message?: string, duration = 4000) {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const newToast: ToastItem = { id, type, title, message, duration };
    this.toasts = [newToast, ...this.toasts].slice(0, 5); // Keep max 5
    this.notifyToastListeners();

    if (duration > 0) {
      setTimeout(() => {
        this.removeToast(id);
      }, duration);
    }
    return id;
  }

  removeToast(id: string) {
    this.toasts = this.toasts.filter((t) => t.id !== id);
    this.notifyToastListeners();
  }

  success(title: string, message?: string, duration = 4000) {
    return this.showToast("success", title, message, duration);
  }

  error(title: string, message?: string, duration = 5000) {
    return this.showToast("error", title, message, duration);
  }

  warning(title: string, message?: string, duration = 4500) {
    return this.showToast("warning", title, message, duration);
  }

  info(title: string, message?: string, duration = 4000) {
    return this.showToast("info", title, message, duration);
  }

  // CONFIRM MODAL API (Replaces browser confirm())
  confirm(options: ConfirmOptions): Promise<boolean> {
    return new Promise((resolve) => {
      if (this.confirmListener) {
        this.confirmListener(options, resolve);
      } else {
        // Fallback if provider not mounted
        if (typeof window !== "undefined") {
          resolve(window.confirm(`${options.title}\n\n${options.message}`));
        } else {
          resolve(false);
        }
      }
    });
  }

  // SPECIALIZED HIGH-IMPACT DELETE MODAL API
  confirmDelete(options: ConfirmDeleteOptions): Promise<boolean> {
    const title =
      options.title ||
      `Hapus ${options.itemType ? `${options.itemType} ` : ""}${options.itemName}?`;
    const message =
      options.message ||
      `Apakah Anda yakin ingin menghapus data ini secara permanen dari server database?`;
    const warningNote =
      options.warningNote ||
      `Tindakan ini tidak dapat dibatalkan. Seluruh riwayat dan keterkaitan data akan disesuaikan otomatis.`;

    return this.confirm({
      title,
      message,
      itemName: options.itemName,
      itemType: options.itemType,
      itemDetails: options.itemDetails,
      warningNote,
      variant: "danger",
      confirmText: options.confirmText || "Hapus Permanen",
      cancelText: options.cancelText || "Batalkan",
    });
  }

  // DELETE SUCCESS TOAST
  deleted(itemName: string, itemType?: string, duration = 4500) {
    return this.showToast(
      "success",
      `${itemType ? `${itemType} ` : ""}Berhasil Dihapus`,
      `Data "${itemName}" telah dihapus secara permanen dari sistem.`,
      duration
    );
  }

  // ALERT MODAL API (Replaces browser alert())
  alert(messageOrOptions: string | AlertOptions, title?: string): Promise<void> {
    const options: AlertOptions =
      typeof messageOrOptions === "string"
        ? { message: messageOrOptions, title: title || "Pemberitahuan", variant: "info" }
        : messageOrOptions;

    return new Promise((resolve) => {
      if (this.alertListener) {
        this.alertListener(options, resolve);
      } else {
        if (typeof window !== "undefined") {
          window.alert(`${options.title || "Pemberitahuan"}\n\n${options.message}`);
        }
        resolve();
      }
    });
  }
}

export const notify = new NotificationManager();
