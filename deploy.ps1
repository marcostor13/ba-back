$IMAGE_NAME = 'ba-back'
$SshUser = "marcostor13"
$Ec2Host = "192.168.100.29" 
$RemoteScriptPath = "/home/$SshUser/deploy.sh"
# $RemoteScriptPath = "/home/$SshUser/deploy.sh"
# $ImageName = "marcostor13/$IMAGE_NAME"
# $ContainerName = "ba-back"
# $HostPort = "3022"
# $ContainerPort = "3022"



Write-Host "BUILDING IMAGE"
docker build -t $IMAGE_NAME .

Write-Host "TAGGING IMAGE"
docker tag $IMAGE_NAME marcostor13/$IMAGE_NAME

Write-Host "PUSHING IMAGE"
docker push marcostor13/$IMAGE_NAME

Write-Host "Conectando a $SshUser@$Ec2Host y ejecutando script remoto '$RemoteScriptPath'..."
$RemoteCommand = "$RemoteScriptPath $IMAGE_NAME"
$SshCommandArgs = @(
    "$SshUser@$Ec2Host",
    $RemoteCommand
)
Write-Host "Comando SSH a ejecutar:"
Write-Host "ssh $SshCommandArgs"


& ssh $SshCommandArgs

if ($LASTEXITCODE -eq 0) {
    Write-Host "Script remoto ejecutado exitosamente (codigo de salida $LASTEXITCODE)."
} else {
    Write-Error "El comando SSH o el script remoto fallaron con código de salida: $LASTEXITCODE"
    Write-Host "Revisa la salida anterior para ver los errores específicos del script remoto."
}

Write-Host "--- Script PowerShell Finalizado ---"
