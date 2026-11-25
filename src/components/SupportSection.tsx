import { useState } from 'react';
import { useCurrency } from '../contexts/CurrencyContext';

interface SupportSectionProps {
  defaultEmail?: string;
  defaultName?: string;
  onNewsletterJoined: (email: string) => void;
}

const FAQS = [
  {
    q: 'How does the Waterholic Lifetime Replacement Warranty work?',
    a: 'Every insulated stainless steel bottle, tumbler, and carafe is covered against vacuum-seal loss, manufacturing defects, and lid leaks for life. Submit your order ID in the form right beside this guide for a fast replacement.',
  },
  {
    q: 'How do college students claim the 15% .edu discount?',
    a: 'Enter any valid .edu or .ac email in the Campus Edition section or enter promo code CAMPUS15 inside the Shopping Bag Drawer. The 15% discount applies instantly to bottles, dorm filter pitchers, and campus bundles.',
  },
  {
    q: 'Are Waterholic bottles dishwasher safe and BPA-free?',
    a: 'All lids, silicone boots, steel straws, and glass vessels are 100% BPA/PFAS-free and top-rack dishwasher safe. Hand washing powder-coated bottles with our Bamboo Brush or Cleaning Tablets keeps matte finishes pristine for years.',
  },
  {
    q: 'What is the shipping speed and return window?',
    a: 'Orders over $60 qualify automatically for Free Express Shipping (2–4 business days). Unused gear can be returned or exchanged for another colour within 45 days at zero restocking fee.',
  },
  {
    q: 'How often should I replace water filter pitcher cartridges?',
    a: 'Each activated coconut-carbon cartridge filters up to 150 L (roughly 2 months of daily dorm or home drinking). Replacement 4-packs are always stocked under Filters & Purifiers.',
  },
];

export function SupportSection({
  defaultEmail = '',
  defaultName = '',
  onNewsletterJoined,
}: SupportSectionProps) {
  const { formatPrice } = useCurrency();
  const [openFaq, setOpenFaq] = useState<number>(0);
  const [supportName, setSupportName] = useState(defaultName);
  const [supportEmail, setSupportEmail] = useState(defaultEmail);
  const [supportTopic, setSupportTopic] = useState('Lifetime Warranty Claim');
  const [supportMessage, setSupportMessage] = useState('');
  const [ticketId, setTicketId] = useState<string | null>(null);

  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [newsletterDone, setNewsletterDone] = useState(false);

  const handleSupportSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!supportName.trim() || !supportEmail.trim() || !supportMessage.trim()) {
      return;
    }
    const id = `SUP-${Math.floor(1000 + Math.random() * 9000)}`;
    setTicketId(id);
    setSupportMessage('');
  };

  const handleNewsletter = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newsletterEmail.trim() || !newsletterEmail.includes('@')) return;
    setNewsletterDone(true);
    onNewsletterJoined(newsletterEmail.trim());
    setNewsletterEmail('');
  };

  return (
    <section id="support" className="support-section" aria-label="Support, Warranty and Newsletter">
      <div className="container">
        <div className="support-header">
          <div>
            <span className="campus-kicker">Care, Warranty & Help</span>
            <h2 className="section-title">Here for every refill.</h2>
          </div>
          <div className="support-guarantees tabular-nums">
            <span>Lifetime Warranty</span>
            <span aria-hidden="true">·</span>
            <span>45-Day Returns</span>
            <span aria-hidden="true">·</span>
            <span>Free Express {formatPrice(60)}+</span>
          </div>
        </div>

        <div className="support-grid">
          {/* Interactive FAQ Accordion */}
          <div className="faq-column">
            <h3 className="support-col-title">Frequently Asked Questions</h3>
            <div className="faq-list">
              {FAQS.map((item, idx) => {
                const isOpen = openFaq === idx;
                const answerText =
                  item.q === 'What is the shipping speed and return window?'
                    ? `Orders over ${formatPrice(60)} qualify automatically for Free Express Shipping (2–4 business days). Unused gear can be returned or exchanged for another colour within 45 days at zero restocking fee.`
                    : item.a;
                return (
                  <div key={item.q} className="faq-item">
                    <button
                      type="button"
                      className="faq-trigger"
                      aria-expanded={isOpen}
                      onClick={() => setOpenFaq(isOpen ? -1 : idx)}
                    >
                      <span>{item.q}</span>
                      <span className="faq-icon" aria-hidden="true">
                        {isOpen ? '−' : '+'}
                      </span>
                    </button>
                    {isOpen && <p className="faq-answer">{answerText}</p>}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Support & Warranty Claim Form */}
          <div className="support-form-card">
            <h3 className="support-col-title">Contact Support & Warranty</h3>
            {ticketId ? (
              <div className="support-ticket-done" role="status">
                <div className="receipt-check" aria-hidden="true">
                  ✓
                </div>
                <h4>Request #{ticketId} Received</h4>
                <p>
                  Our Waterholic hydration specialists will reply to{' '}
                  <strong>{supportEmail}</strong> within 1 business day.
                </p>
                <button
                  type="button"
                  className="btn-card-secondary"
                  onClick={() => setTicketId(null)}
                >
                  Send Another Request
                </button>
              </div>
            ) : (
              <form className="checkout-form" onSubmit={handleSupportSubmit}>
                <div className="form-field">
                  <label htmlFor="sup-name">Your Name</label>
                  <input
                    id="sup-name"
                    type="text"
                    required
                    placeholder="Alex Mercer"
                    value={supportName}
                    onChange={(e) => setSupportName(e.target.value)}
                  />
                </div>
                <div className="form-field">
                  <label htmlFor="sup-email">Email</label>
                  <input
                    id="sup-email"
                    type="email"
                    required
                    placeholder="alex@example.com"
                    value={supportEmail}
                    onChange={(e) => setSupportEmail(e.target.value)}
                  />
                </div>
                <div className="form-field">
                  <label htmlFor="sup-topic">Topic</label>
                  <select
                    id="sup-topic"
                    className="filter-select"
                    value={supportTopic}
                    onChange={(e) => setSupportTopic(e.target.value)}
                  >
                    <option value="Lifetime Warranty Claim">Lifetime Warranty Claim</option>
                    <option value="Order & Shipping Status">Order & Shipping Status</option>
                    <option value="Campus Bulk / Club Order">Campus Bulk / Club Order</option>
                    <option value="Product & Filter Advice">Product & Filter Advice</option>
                  </select>
                </div>
                <div className="form-field">
                  <label htmlFor="sup-msg">How can we help?</label>
                  <textarea
                    id="sup-msg"
                    rows={3}
                    required
                    placeholder="Include your Order #WH-... if applicable."
                    value={supportMessage}
                    onChange={(e) => setSupportMessage(e.target.value)}
                  />
                </div>
                <button type="submit" className="btn btn-primary btn-full">
                  Submit Request
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Hydration Dispatch Newsletter Bar */}
        <div className="newsletter-bar">
          <div>
            <h3>Join the Waterholic Hydration Dispatch</h3>
            <p className="profile-muted">
              Get early access to seasonal bottle colours and instant promo code{' '}
              <code>WATER10</code> for 10% off your first bag.
            </p>
          </div>
          {newsletterDone ? (
            <div className="student-perk-active" role="status">
              <span className="perk-check" aria-hidden="true">
                ✓
              </span>
              <div>
                <strong>Welcome to Waterholic</strong>
                <span>Use code WATER10 in your Bag for 10% off</span>
              </div>
            </div>
          ) : (
            <form className="student-perk-form" onSubmit={handleNewsletter}>
              <div className="student-input-row">
                <input
                  type="email"
                  required
                  className="student-email-input"
                  placeholder="Enter your email for 10% off..."
                  aria-label="Newsletter email address"
                  value={newsletterEmail}
                  onChange={(e) => setNewsletterEmail(e.target.value)}
                />
                <button type="submit" className="btn btn-primary">
                  Subscribe
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
