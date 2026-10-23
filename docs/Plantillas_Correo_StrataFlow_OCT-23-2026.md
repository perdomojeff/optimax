# Plantillas de correo de StrataFlow (Supabase Auth)

Pegar cada bloque en Supabase → Authentication → Emails → Templates (campo «Subject» y «Message body», modo código fuente).

## 1. Confirmar registro (Confirm signup)

**Asunto: Confirme su cuenta en StrataFlow**

```html
<div style="font-family:Arial,Helvetica,sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#1f2937">
  <h2 style="color:#0b2a4a;margin:0 0 4px">StrataFlow</h2>
  <hr style="border:none;border-top:2px solid #0b2a4a;margin:8px 0 20px">
  <h3 style="margin:0 0 12px">Confirme su cuenta</h3>
  <p style="line-height:1.5">Gracias por registrarse en StrataFlow. Para activar su cuenta, confirme su correo electrónico.</p>
  <p style="margin:24px 0"><a href="{{ .ConfirmationURL }}" style="background:#0b2a4a;color:#ffffff;padding:12px 22px;border-radius:6px;text-decoration:none;font-weight:bold">Confirmar mi cuenta</a></p>
  <p style="font-size:13px;color:#6b7280;line-height:1.5">Si usted no solicitó esta cuenta, puede ignorar este mensaje.</p>
</div>
```

## 2. Invitar usuario (Invite user)

**Asunto: Ha sido invitado a StrataFlow**

```html
<div style="font-family:Arial,Helvetica,sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#1f2937">
  <h2 style="color:#0b2a4a;margin:0 0 4px">StrataFlow</h2>
  <hr style="border:none;border-top:2px solid #0b2a4a;margin:8px 0 20px">
  <h3 style="margin:0 0 12px">Ha sido invitado</h3>
  <p style="line-height:1.5">Se le ha invitado a unirse a StrataFlow. Acepte la invitación para crear su acceso.</p>
  <p style="margin:24px 0"><a href="{{ .ConfirmationURL }}" style="background:#0b2a4a;color:#ffffff;padding:12px 22px;border-radius:6px;text-decoration:none;font-weight:bold">Aceptar invitación</a></p>
  <p style="font-size:13px;color:#6b7280;line-height:1.5">Si no esperaba esta invitación, puede ignorar este mensaje.</p>
</div>
```

## 3. Enlace mágico (Magic Link)

**Asunto: Su enlace de acceso a StrataFlow**

```html
<div style="font-family:Arial,Helvetica,sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#1f2937">
  <h2 style="color:#0b2a4a;margin:0 0 4px">StrataFlow</h2>
  <hr style="border:none;border-top:2px solid #0b2a4a;margin:8px 0 20px">
  <h3 style="margin:0 0 12px">Acceso a StrataFlow</h3>
  <p style="line-height:1.5">Utilice el siguiente enlace para ingresar a su cuenta.</p>
  <p style="margin:24px 0"><a href="{{ .ConfirmationURL }}" style="background:#0b2a4a;color:#ffffff;padding:12px 22px;border-radius:6px;text-decoration:none;font-weight:bold">Ingresar a StrataFlow</a></p>
  <p style="font-size:13px;color:#6b7280;line-height:1.5">El enlace caduca en poco tiempo y solo puede usarse una vez.</p>
</div>
```

## 4. Cambio de correo (Change Email Address)

**Asunto: Confirme el cambio de correo en StrataFlow**

```html
<div style="font-family:Arial,Helvetica,sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#1f2937">
  <h2 style="color:#0b2a4a;margin:0 0 4px">StrataFlow</h2>
  <hr style="border:none;border-top:2px solid #0b2a4a;margin:8px 0 20px">
  <h3 style="margin:0 0 12px">Confirme su nuevo correo</h3>
  <p style="line-height:1.5">Recibimos una solicitud para cambiar el correo de su cuenta de StrataFlow.</p>
  <p style="margin:24px 0"><a href="{{ .ConfirmationURL }}" style="background:#0b2a4a;color:#ffffff;padding:12px 22px;border-radius:6px;text-decoration:none;font-weight:bold">Confirmar cambio</a></p>
  <p style="font-size:13px;color:#6b7280;line-height:1.5">Si usted no lo solicitó, ignore este mensaje y comuníquese con el administrador.</p>
</div>
```

## 5. Restablecer contraseña (Reset Password)

**Asunto: Restablezca su contraseña de StrataFlow**

```html
<div style="font-family:Arial,Helvetica,sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#1f2937">
  <h2 style="color:#0b2a4a;margin:0 0 4px">StrataFlow</h2>
  <hr style="border:none;border-top:2px solid #0b2a4a;margin:8px 0 20px">
  <h3 style="margin:0 0 12px">Restablecer contraseña</h3>
  <p style="line-height:1.5">Recibimos una solicitud para restablecer la contraseña de su cuenta de StrataFlow.</p>
  <p style="margin:24px 0"><a href="{{ .ConfirmationURL }}" style="background:#0b2a4a;color:#ffffff;padding:12px 22px;border-radius:6px;text-decoration:none;font-weight:bold">Crear nueva contraseña</a></p>
  <p style="font-size:13px;color:#6b7280;line-height:1.5">Si usted no lo solicitó, puede ignorar este mensaje; su contraseña no cambiará.</p>
</div>
```

## 6. Reautenticación (Reauthentication)

**Asunto: Código de verificación de StrataFlow**

```html
<div style="font-family:Arial,Helvetica,sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#1f2937">
  <h2 style="color:#0b2a4a;margin:0 0 4px">StrataFlow</h2>
  <hr style="border:none;border-top:2px solid #0b2a4a;margin:8px 0 20px">
  <p>Ingrese el siguiente código para confirmar su identidad:</p>
  <p style="font-size:28px;font-weight:bold;letter-spacing:4px">{{ .Token }}</p>
</div>
```

