# PROMPTS

## AI-Assisted Testing

The following reconstructed prompts describe AI assistance used during LotWise testing.

### 1. Backend Test Cases
Review backend tests and identify missing edge cases for authentication, vehicle management, inventory updates, and error handling.

### 2. Stock Validation
Develop tests for zero stock, maximum stock limits, invalid quantities, and attempts to exceed inventory constraints.

### 3. Concurrent Purchases
Create integration tests to verify that simultaneous purchase requests cannot oversell inventory and that stock remains consistent.

### 4. Transaction Rollback
Test whether failed database operations roll back correctly and preserve inventory and stock movement consistency.

### 5. Frontend Tests
Identify and test important frontend interactions, validation rules, purchase controls, and error states.

### 6. Test Verification
Run the test suite, review failures, check coverage, and identify gaps without claiming unverified results.

### 7. Test-Driven Development
Apply the Red-Green-Refactor process to the maximum-stock rule: write a failing test, implement the minimum required change, and refactor while keeping tests passing.
