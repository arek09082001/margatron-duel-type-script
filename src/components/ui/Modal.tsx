'use client';

type ModalProps = {
    onClose: () => void;
    className?: string;
    children: React.ReactNode;
};

/** Backdrop-dismissable modal, matching the `.modal > .modal-content` markup. */
export default function Modal({ onClose, className = '', children }: ModalProps) {
    return (
        <div
            className="modal"
            onClick={(event) => {
                if (event.target === event.currentTarget) {
                    onClose();
                }
            }}
        >
            <div className={`modal-content ${className}`.trim()}>{children}</div>
        </div>
    );
}
