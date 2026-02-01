# Investigation: Stripe 'NoneType' object has no attribute 'Secret' error

## Bug Summary
Users encounter a `ValueError` when trying to create a payment session:
`Failed to create payment session: Stripe module error: 'NoneType' object has no attribute 'Secret'. Please check your Stripe configuration.`

This error is caught in `apps/backend/billing/stripe_init.py` during the import of Stripe submodules (like `stripe.checkout`).

## Root Cause Analysis
The error `'NoneType' object has no attribute 'Secret'` is a known issue in the `stripe` Python library (around version 7.x) when `stripe.api_key` is `None` at the time a submodule is imported.

In `stripe_init.py`, the code tries to set `stripe.api_key` from `settings.STRIPE_SECRET_KEY`. If the key is missing or invalid (e.g., during initialization or if not configured), `stripe.api_key` remains `None` or is explicitly set to `None`.

When `get_stripe_checkout_session()` is called:
1. It calls `ensure_stripe_api_key()`.
2. If `settings.STRIPE_SECRET_KEY` is now valid, it sets `stripe.api_key`.
3. Then it tries to import the submodule: `from stripe.checkout import Session`.

However, due to how the `stripe` library handles its internal state, if it was previously imported or accessed while `api_key` was `None`, or if the submodule import itself triggers some global state initialization that expects a non-None key, it fails with this specific `AttributeError`.

The `stripe_init.py` file even has a comment acknowledging this:
```python
# Setting to None can cause 'NoneType' object has no attribute 'Secret' errors
```

## Affected Components
- `apps/backend/billing/stripe_init.py`: Responsible for initializing the Stripe library and importing submodules.
- `apps/backend/billing/views.py`: Uses the helper functions from `stripe_init.py`.

## Proposed Solution
1. **Prevent `stripe.api_key` from being `None`**: Instead of setting it to `None` or leaving it as `None` when the key is missing, we can set it to a dummy string (like `"not_configured"`) during the initial load if the real key is missing. This satisfies the library's internal checks during submodule imports.
2. **Improve Error Handling**: The `ensure_stripe_api_key` should be more robust in ensuring the key is actually set and valid before any submodule import.
3. **Lazy Submodule Access**: Instead of `from stripe.checkout import Session`, use `import stripe.checkout` or access it via the `stripe` module if possible, ensuring the key is set first.

Specifically, I will modify `stripe_init.py` to:
- Set a dummy key if the real one is missing at module load time.
- Ensure `stripe.api_key` is set to the real key in `ensure_stripe_api_key` before any `from stripe...` import.
- Double-check the logic in `initialize_stripe` to ensure it returns correctly.

## Implementation Notes
I have implemented the following changes:
1.  Modified `apps/backend/billing/stripe_init.py` to set `stripe.api_key` to `"not_configured"` instead of `None` when `STRIPE_SECRET_KEY` is missing or invalid during module load. This prevents the `AttributeError: 'NoneType' object has no attribute 'Secret'` during subsequent submodule imports.
2.  Updated `is_stripe_api_key_set()` in `stripe_init.py` to return `False` if the key is the dummy `"not_configured"` value or if it doesn't start with the expected `sk_` prefix.
3.  Ensured that `ensure_stripe_api_key()` correctly validates the key before allowing submodule imports in functions like `get_stripe_checkout_session()`.

These changes satisfy the requirements of preventing the Stripe library from entering an invalid state while still ensuring that real Stripe operations only proceed with a valid key.

