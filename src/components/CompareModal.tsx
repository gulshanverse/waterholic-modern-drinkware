import { useEffect } from 'react';
import { CATEGORY_MAP, type Product } from '../data/products';
import type { AddToBagPayload } from './CatalogSection';
import { triggerAddToBagHaptic } from '../utils/hapticFeedback';

interface CompareModalProps {
  open: boolean;
  products: Product[];
  onClose: () => void;
  onRemoveProduct: (id: string) => void;
  onAddToBag: (payload: AddToBagPayload) => void;
}

export function CompareModal({
  open,
  products,
  onClose,
  onRemoveProduct,
  onAddToBag,
}: CompareModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open || products.length === 0) return null;

  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onClick={onClose}
      data-lenis-prevent
    >
      <div
        className="compare-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="compare-modal-title"
        onClick={(e) => e.stopPropagation()}
        data-lenis-prevent
      >
        <div className="compare-modal-head">
          <div>
            <h2 id="compare-modal-title" className="modal-product-title">
              Side-by-Side Comparison
            </h2>
            <p className="profile-muted">
              Compare specs, materials, capacity, and pricing across up to 3
              Waterholic products.
            </p>
          </div>
          <button
            type="button"
            className="icon-btn"
            aria-label="Close comparison"
            onClick={onClose}
          >
            ×
          </button>
        </div>

        <div className="compare-table-wrap">
          <table className="compare-table">
            <thead>
              <tr>
                <th scope="col">Specification</th>
                {products.map((p) => (
                  <th key={p.id} scope="col">
                    <div className="compare-col-head">
                      <img
                        src={p.image}
                        alt={p.name}
                        referrerPolicy="no-referrer"
                        className="compare-thumb"
                      />
                      <span className="compare-prod-name">{p.name}</span>
                      <button
                        type="button"
                        className="bag-remove-btn"
                        onClick={() => onRemoveProduct(p.id)}
                      >
                        Remove
                      </button>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Price</td>
                {products.map((p) => (
                  <td key={p.id} className="tabular-nums compare-price">
                    ${p.price}
                  </td>
                ))}
              </tr>
              <tr>
                <td>Category</td>
                {products.map((p) => (
                  <td key={p.id}>{CATEGORY_MAP[p.category].shortName}</td>
                ))}
              </tr>
              <tr>
                <td>Variety</td>
                {products.map((p) => (
                  <td key={p.id}>{p.variety}</td>
                ))}
              </tr>
              <tr>
                <td>Capacity</td>
                {products.map((p) => (
                  <td key={p.id} className="tabular-nums">
                    {p.capacity}
                  </td>
                ))}
              </tr>
              <tr>
                <td>Material</td>
                {products.map((p) => (
                  <td key={p.id}>{p.material}</td>
                ))}
              </tr>
              <tr>
                <td>Performance</td>
                {products.map((p) => (
                  <td key={p.id}>{p.highlightSpec}</td>
                ))}
              </tr>
              <tr>
                <td>Weight</td>
                {products.map((p) => (
                  <td key={p.id} className="tabular-nums">
                    {p.weight}
                  </td>
                ))}
              </tr>
              <tr>
                <td>Rating</td>
                {products.map((p) => (
                  <td key={p.id} className="tabular-nums">
                    ★ {p.rating.toFixed(1)} ({p.reviews})
                  </td>
                ))}
              </tr>
              <tr>
                <td>Colours</td>
                {products.map((p) => (
                  <td key={p.id}>{p.finishes.map((f) => f.name).join(', ')}</td>
                ))}
              </tr>
              <tr>
                <td>Action</td>
                {products.map((p) => {
                  const defaultSize =
                    p.sizes.find((s) => s.priceDelta === 0) ?? p.sizes[0];
                  return (
                    <td key={p.id}>
                      <button
                        type="button"
                        className="btn-card-primary"
                        onClick={(e) => {
                          triggerAddToBagHaptic(e.currentTarget);
                          onAddToBag({
                            product: p,
                            finish: p.finishes[0],
                            sizeLabel: defaultSize?.label ?? p.capacity,
                            unitPrice: p.price + (defaultSize?.priceDelta ?? 0),
                            qty: 1,
                          });
                        }}
                      >
                        Add to Bag
                      </button>
                    </td>
                  );
                })}
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
