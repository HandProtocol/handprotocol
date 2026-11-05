#!/usr/bin/env python3
"""Print one secret from the GNOME keyring (Secret Service) to stdout.

    keyring-secret.py <service> <username>      e.g.  keyring-secret.py "Supabase CLI" access-token

Tries python-secretstorage first, then a raw Gio D-Bus session. Never logs
the value anywhere but stdout; the caller keeps it in memory.
"""
import sys

service, username = sys.argv[1], sys.argv[2]


def via_secretstorage():
    import secretstorage
    conn = secretstorage.dbus_init()
    coll = secretstorage.get_default_collection(conn)
    if coll.is_locked():
        coll.unlock()
    # collection.search_items() can throw on a stale item path; walk the raw
    # results and skip the ones that fail.
    paths = coll.item_iface  # noqa: F841 (keeps the proxy alive)
    for item in coll.get_all_items():
        try:
            attrs = item.get_attributes()
        except Exception:
            continue
        if attrs.get('service') == service and attrs.get('username') == username:
            return item.get_secret().decode('utf-8')
    return None


def via_gio():
    from gi.repository import Gio, GLib
    bus = Gio.bus_get_sync(Gio.BusType.SESSION, None)
    def call(path, iface, method, params, reply_type):
        return bus.call_sync('org.freedesktop.secrets', path, iface, method, params, GLib.VariantType(reply_type), Gio.DBusCallFlags.NONE, -1, None)
    session = call('/org/freedesktop/secrets', 'org.freedesktop.Secret.Service', 'OpenSession',
                   GLib.Variant('(sv)', ('plain', GLib.Variant('s', ''))), '(vo)')[1]
    unlocked, locked = call('/org/freedesktop/secrets', 'org.freedesktop.Secret.Service', 'SearchItems',
                            GLib.Variant('(a{ss})', ({'service': service, 'username': username},)), '(aoao)')
    for path in list(unlocked) + list(locked):
        try:
            sec = call(path, 'org.freedesktop.Secret.Item', 'GetSecret', GLib.Variant('(o)', (session,)), '((oayays))')[0]
            return bytes(sec[2]).decode('utf-8')
        except Exception:
            continue
    return None


value = None
errors = []
for fn in (via_secretstorage, via_gio):
    try:
        value = fn()
        if value:
            break
    except Exception as e:  # try the next backend
        errors.append(f'{fn.__name__}: {e}')
if not value:
    sys.stderr.write('keyring: secret not found. ' + '; '.join(errors) + '\n')
    sys.exit(1)
sys.stdout.write(value)
