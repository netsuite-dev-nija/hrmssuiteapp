@echo off

for %%i in (

) do (
    suitecloud object:import --type ALL --destinationfolder "/Objects" --scriptid %%i
)