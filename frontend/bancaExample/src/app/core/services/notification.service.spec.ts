import {TestBed} from '@angular/core/testing';

describe('NotificationService', () => {
  let service: NotificationService;
  beforeEach(() => {
    service = TestBed.inject(NotificationService);
  });

  it('does not publish the same visible notification twice', () => {
    service.show('error', 'Connection failed');
    const original = service.current();
    service.show('error', 'Connection failed');
    expect(service.current()).toBe(original);
  });

  it('replaces an old notification when the message or kind changes', () => {
    service.show('error', 'Message');
    service.show('success', 'Message');
    expect(service.current()).toEqual({kind: 'success', message: 'Message'});
    service.show('error', 'Other error');
    expect(service.current()).toEqual({kind: 'error', message: 'Other error'});
  });

  it('ignores empty messages and clears only the requested kind', () => {
    service.show('error', 'Connection failed');
    service.show('success', '  ');
    service.clear('success');
    expect(service.current()?.kind).toBe('error');
    service.clear();
    expect(service.current()).toBeNull();
  });

  it('allows the same message again after clearing it', () => {
    service.show('success', 'Saved');
    service.clear();
    service.show('success', 'Saved');
    expect(service.current()?.message).toBe('Saved');
  });
});
