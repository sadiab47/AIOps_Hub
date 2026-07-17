# 09 Testing Strategy

We maintain code quality by enforcing test guidelines.

## Unit Testing
- Mock repository layers using standard Jest mocks.
- Test service functions independently from ORM operations.

## Integration Testing
- Execute API route testing against a local database instance.
- Validate request validation pipes and error response schemas.
