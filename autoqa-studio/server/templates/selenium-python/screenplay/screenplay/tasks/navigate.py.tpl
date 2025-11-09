def navigate_to(path: str):
    def task(actor):
        driver = actor.ability('driver')
        driver.get(f'http://localhost:3000{path}')
    return task
